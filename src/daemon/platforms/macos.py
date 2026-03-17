"""macOS window reader using Quartz / Core Graphics APIs."""

from __future__ import annotations

import sys
from typing import Optional

from ..config import IGNORE_APPS, MIN_HEIGHT, MIN_WIDTH, colour_for_bundle
from ..models import Screen, Window

try:
    import Quartz
    from AppKit import NSWorkspace, NSScreen
    from ApplicationServices import (
        AXIsProcessTrustedWithOptions,
        kAXTrustedCheckOptionPrompt,
    )
    from HIServices import (
        AXUIElementCreateApplication,
        AXUIElementCopyAttributeValue,
    )
except ImportError:
    print(
        "Error: pyobjc is required. Install with:\n"
        "  pip install -r src/daemon/requirements.txt",
        file=sys.stderr,
    )
    sys.exit(1)


def check_accessibility() -> bool:
    """Check whether the process has Accessibility access.

    Returns True if granted, False otherwise.
    """
    # AXIsProcessTrustedWithOptions prompts the user if needed
    trusted = AXIsProcessTrustedWithOptions(
        {kAXTrustedCheckOptionPrompt: True}
    )
    return bool(trusted)


def get_screen_info() -> Screen:
    """Return the main display's dimensions and scale factor."""
    main = NSScreen.mainScreen()
    frame = main.frame()
    scale = main.backingScaleFactor()
    return Screen(
        width=int(frame.size.width),
        height=int(frame.size.height),
        scale_factor=float(scale),
    )


def _get_active_window_id() -> Optional[int]:
    """Return the window ID of the currently focused window, or None."""
    active_app = NSWorkspace.sharedWorkspace().frontmostApplication()
    if active_app is None:
        return None

    pid = active_app.processIdentifier()

    # Get the frontmost window of the active application via Accessibility API
    app_ref = AXUIElementCreateApplication(pid)
    err, focused_window = AXUIElementCopyAttributeValue(
        app_ref, "AXFocusedWindow", None
    )
    if err != 0 or focused_window is None:
        return None

    # Attempt to get the CGWindowID from the AXUIElement
    # _AXUIElementGetWindow is a private API; fall back to matching by PID
    try:
        from HIServices import AXUIElementGetWindow  # type: ignore[attr-defined]
        err, window_id = AXUIElementGetWindow(focused_window, None)
        if err == 0:
            return int(window_id)
    except (ImportError, AttributeError):
        pass

    return None


def get_windows() -> list[Window]:
    """Read all on-screen windows from macOS.

    Filters out system UI elements, zero-size windows, and off-screen windows.
    """
    screen = get_screen_info()
    active_wid = _get_active_window_id()

    # kCGWindowListOptionOnScreenOnly excludes off-screen and minimised windows
    window_list = Quartz.CGWindowListCopyWindowInfo(
        Quartz.kCGWindowListOptionOnScreenOnly | Quartz.kCGWindowListExcludeDesktopElements,
        Quartz.kCGNullWindowID,
    )

    if window_list is None:
        return []

    windows: list[Window] = []

    # CGWindowListCopyWindowInfo returns windows in front-to-back order.
    # We first collect valid windows, then assign z-indices afterwards.
    raw_windows: list[tuple] = []

    for w in window_list:
        # Skip windows without an owner
        owner = w.get(Quartz.kCGWindowOwnerName, "")
        if not owner:
            continue

        # Skip ignored apps
        if owner in IGNORE_APPS:
            continue

        # Skip windows at the desktop layer (layer 0 is normal windows)
        layer = w.get(Quartz.kCGWindowLayer, 0)
        if layer != 0:
            continue

        # Get bounds
        bounds = w.get(Quartz.kCGWindowBounds)
        if bounds is None:
            continue

        x = int(bounds.get("X", 0))
        y = int(bounds.get("Y", 0))
        width = int(bounds.get("Width", 0))
        height = int(bounds.get("Height", 0))

        # Filter out tiny windows
        if width < MIN_WIDTH or height < MIN_HEIGHT:
            continue

        # Filter out windows entirely off-screen
        if x + width < 0 or y + height < 0:
            continue
        if x > screen.width or y > screen.height:
            continue

        wid = w.get(Quartz.kCGWindowNumber, 0)
        pid = w.get(Quartz.kCGWindowOwnerPID, 0)
        title = w.get(Quartz.kCGWindowName, "") or ""

        # Get bundle ID from the running application
        bundle_id = _bundle_id_for_pid(pid)

        raw_windows.append(
            (wid, owner, title, bundle_id, x, y, width, height)
        )

    # Assign z-indices: first in list = frontmost = highest z-index
    total = len(raw_windows)
    for i, (wid, owner, title, bundle_id, x, y, width, height) in enumerate(raw_windows):
        windows.append(
            Window(
                id=f"w-{wid}",
                app=owner,
                title=title,
                bundle_id=bundle_id,
                x=x,
                y=y,
                width=width,
                height=height,
                space=1,
                is_active=(wid == active_wid),
                is_minimised=False,
                colour=colour_for_bundle(bundle_id),
                z_index=total - i,
            )
        )

    return windows


_pid_bundle_cache: dict[int, str] = {}


def _bundle_id_for_pid(pid: int) -> str:
    """Look up the bundle identifier for a process ID. Caches results."""
    if pid in _pid_bundle_cache:
        return _pid_bundle_cache[pid]

    apps = NSWorkspace.sharedWorkspace().runningApplications()
    for app in apps:
        if app.processIdentifier() == pid:
            bid = app.bundleIdentifier() or ""
            _pid_bundle_cache[pid] = bid
            return bid

    _pid_bundle_cache[pid] = ""
    return ""
