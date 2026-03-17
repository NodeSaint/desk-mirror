"""Execute inbound commands from the relay server."""

from __future__ import annotations

import sys
import json
from typing import Any

try:
    from HIServices import (
        AXUIElementCreateApplication,
        AXUIElementCopyAttributeValue,
        AXUIElementSetAttributeValue,
        AXUIElementPerformAction,
        AXValueCreate,
    )
    import Quartz
    from Quartz import CGPoint, CGSize
    from AppKit import NSWorkspace

    # AXValue type constants
    kAXValueTypeCGPoint = 1
    kAXValueTypeCGSize = 2
except ImportError:
    pass  # Handled in main.py


def _find_ax_window(window_id: int) -> Any | None:
    """Find the AXUIElement for a window by its CGWindowID.

    Iterates running applications to match the window.
    """
    # Get the window's owner PID from CGWindowList
    window_list = Quartz.CGWindowListCopyWindowInfo(
        Quartz.kCGWindowListOptionAll,
        Quartz.kCGNullWindowID,
    )
    if not window_list:
        return None

    target_pid = None
    for w in window_list:
        if w.get(Quartz.kCGWindowNumber, 0) == window_id:
            target_pid = w.get(Quartz.kCGWindowOwnerPID, 0)
            break

    if not target_pid:
        return None

    app_ref = AXUIElementCreateApplication(target_pid)

    # Get the app's windows
    err, windows = AXUIElementCopyAttributeValue(app_ref, "AXWindows", None)
    if err != 0 or not windows:
        return None

    # Match by CGWindowID
    for ax_win in windows:
        try:
            from HIServices import AXUIElementGetWindow  # type: ignore[attr-defined]
            err, wid = AXUIElementGetWindow(ax_win, None)
            if err == 0 and wid == window_id:
                return ax_win
        except (ImportError, AttributeError):
            pass

    # If we can't match by ID, return the first window (best effort)
    return windows[0] if windows else None


def _parse_window_id(raw_id: str) -> int:
    """Extract the numeric window ID from 'w-12345' format."""
    return int(raw_id.replace("w-", ""))


def execute_focus(window_id: str) -> tuple[bool, str | None]:
    """Bring a window to the front."""
    try:
        wid = _parse_window_id(window_id)

        # Find the owning app and activate it
        window_list = Quartz.CGWindowListCopyWindowInfo(
            Quartz.kCGWindowListOptionAll,
            Quartz.kCGNullWindowID,
        )
        if not window_list:
            return False, "Could not read window list"

        target_pid = None
        for w in window_list:
            if w.get(Quartz.kCGWindowNumber, 0) == wid:
                target_pid = w.get(Quartz.kCGWindowOwnerPID, 0)
                break

        if not target_pid:
            return False, "Window not found"

        # Activate the application
        apps = NSWorkspace.sharedWorkspace().runningApplications()
        for app in apps:
            if app.processIdentifier() == target_pid:
                app.activateWithOptions_(
                    1  # NSApplicationActivateIgnoringOtherApps
                )
                break

        # Raise the specific window
        ax_win = _find_ax_window(wid)
        if ax_win:
            AXUIElementPerformAction(ax_win, "AXRaise")

        return True, None
    except Exception as e:
        return False, str(e)


def execute_move(
    window_id: str, x: int, y: int, width: int, height: int
) -> tuple[bool, str | None]:
    """Move and resize a window."""
    try:
        wid = _parse_window_id(window_id)
        ax_win = _find_ax_window(wid)
        if not ax_win:
            return False, "Window not found"

        # Set position
        position = CGPoint(x=float(x), y=float(y))
        position_value = AXValueCreate(kAXValueTypeCGPoint, position)
        AXUIElementSetAttributeValue(ax_win, "AXPosition", position_value)

        # Set size
        size = CGSize(width=float(width), height=float(height))
        size_value = AXValueCreate(kAXValueTypeCGSize, size)
        AXUIElementSetAttributeValue(ax_win, "AXSize", size_value)

        return True, None
    except Exception as e:
        return False, str(e)


def execute_close(window_id: str) -> tuple[bool, str | None]:
    """Close a window."""
    try:
        wid = _parse_window_id(window_id)
        ax_win = _find_ax_window(wid)
        if not ax_win:
            return False, "Window not found"

        # Get the close button
        err, close_button = AXUIElementCopyAttributeValue(
            ax_win, "AXCloseButton", None
        )
        if err != 0 or not close_button:
            return False, "No close button found"

        AXUIElementPerformAction(close_button, "AXPress")
        return True, None
    except Exception as e:
        return False, str(e)


def execute_space(space_number: int) -> tuple[bool, str | None]:
    """Switch to a virtual desktop using Ctrl+N keyboard shortcut.

    Requires keyboard shortcuts to be configured in:
    System Settings > Keyboard > Keyboard Shortcuts > Mission Control
    """
    try:
        # Ctrl + space_number (1-9)
        if not 1 <= space_number <= 9:
            return False, f"Invalid space number: {space_number}"

        # Key codes for 1-9
        key_codes = {
            1: 0x12, 2: 0x13, 3: 0x14, 4: 0x15, 5: 0x17,
            6: 0x16, 7: 0x1A, 8: 0x1C, 9: 0x19,
        }
        key_code = key_codes[space_number]

        # Ctrl key modifier
        ctrl_flag = 0x40000  # kCGEventFlagMaskControl

        # Key down
        event = Quartz.CGEventCreateKeyboardEvent(None, key_code, True)
        Quartz.CGEventSetFlags(event, ctrl_flag)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)

        # Key up
        event = Quartz.CGEventCreateKeyboardEvent(None, key_code, False)
        Quartz.CGEventSetFlags(event, ctrl_flag)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)

        return True, None
    except Exception as e:
        return False, str(e)


def handle_command(message: dict) -> dict:
    """Dispatch a command message and return a command:ack response."""
    msg_type = message.get("type", "")
    command_id = message.get("commandId", "")

    success = False
    error: str | None = None

    if msg_type == "command:focus":
        success, error = execute_focus(message["windowId"])
    elif msg_type == "command:move":
        success, error = execute_move(
            message["windowId"],
            message["x"],
            message["y"],
            message["width"],
            message["height"],
        )
    elif msg_type == "command:close":
        success, error = execute_close(message["windowId"])
    elif msg_type == "command:space":
        success, error = execute_space(message["spaceNumber"])
    else:
        error = f"Unknown command type: {msg_type}"

    ack: dict = {
        "type": "command:ack",
        "commandId": command_id,
        "success": success,
    }
    if error:
        ack["error"] = error

    return ack
