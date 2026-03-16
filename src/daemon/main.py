"""Desk Mirror — Desktop Daemon entry point.

Polls macOS for window positions and streams them to the relay server
via WebSocket. Falls back to stdout if --stdout flag is passed.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import signal
import sys
import time

from .config import POLL_INTERVAL, SERVER_HOST, SERVER_PORT
from .commands import handle_command
from .differ import diff_layouts
from .models import Window
from .platforms.macos import check_accessibility, get_screen_info, get_windows


def _build_full_message(windows: list[Window]) -> dict:
    screen = get_screen_info()
    return {
        "type": "layout:full",
        "timestamp": int(time.time() * 1000),
        "screen": screen.to_dict(),
        "windows": [w.to_dict() for w in windows],
    }


def _build_diff_message(previous: list[Window], current: list[Window]) -> dict | None:
    diff = diff_layouts(previous, current)
    if diff.is_empty:
        return None
    msg = diff.to_dict()
    msg["type"] = "layout:diff"
    msg["timestamp"] = int(time.time() * 1000)
    return msg


def _check_permissions() -> None:
    """Warn if accessibility access is not granted."""
    if not check_accessibility():
        print(
            "Warning: Accessibility access not granted.\n"
            "Window positions will be read, but active-window detection\n"
            "and commands (focus, move, close) will not work.\n"
            "\n"
            "To enable full functionality, grant permission in:\n"
            "  System Settings > Privacy & Security > Accessibility\n"
            "\n"
            "Add this application (Terminal, Python, or your IDE) to the list,\n"
            "then restart the daemon.\n",
            file=sys.stderr,
        )


# --- stdout mode (Sprint 1 compat) ---

def run_stdout() -> None:
    """Poll loop that outputs JSON to stdout."""
    running = True

    def _handle_signal(sig: int, frame: object) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    _check_permissions()

    previous: list[Window] = []
    first_run = True

    while running:
        start = time.monotonic()
        current = get_windows()

        if first_run:
            print(json.dumps(_build_full_message(current)), flush=True)
            first_run = False
        else:
            msg = _build_diff_message(previous, current)
            if msg:
                print(json.dumps(msg), flush=True)

        previous = current

        elapsed = time.monotonic() - start
        sleep_time = max(0, POLL_INTERVAL - elapsed)
        if sleep_time > 0 and running:
            time.sleep(sleep_time)


# --- WebSocket mode ---

async def run_websocket() -> None:
    """Connect to the relay server and stream layout updates."""
    try:
        import websockets  # type: ignore[import-untyped]
    except ImportError:
        print(
            "Error: websockets library required for server mode.\n"
            "  pip install websockets",
            file=sys.stderr,
        )
        sys.exit(1)

    _check_permissions()

    url = f"ws://{SERVER_HOST}:{SERVER_PORT}/daemon"
    print(f"Connecting to relay server at {url}...", file=sys.stderr)

    backoff = 1.0
    max_backoff = 30.0

    while True:
        try:
            async with websockets.connect(url) as ws:  # type: ignore[attr-defined]
                print("Connected to relay server.", file=sys.stderr)
                backoff = 1.0  # Reset on successful connection

                previous: list[Window] = []
                first_run = True

                # Start command listener in background
                command_task = asyncio.create_task(_listen_commands(ws))

                try:
                    while True:
                        start = time.monotonic()
                        current = get_windows()

                        if first_run:
                            await ws.send(json.dumps(_build_full_message(current)))
                            first_run = False
                        else:
                            msg = _build_diff_message(previous, current)
                            if msg:
                                await ws.send(json.dumps(msg))

                        previous = current

                        elapsed = time.monotonic() - start
                        sleep_time = max(0, POLL_INTERVAL - elapsed)
                        if sleep_time > 0:
                            await asyncio.sleep(sleep_time)
                finally:
                    command_task.cancel()
                    try:
                        await command_task
                    except asyncio.CancelledError:
                        pass

        except (ConnectionRefusedError, OSError) as e:
            print(
                f"Connection failed: {e}. Retrying in {backoff:.0f}s...",
                file=sys.stderr,
            )
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, max_backoff)
        except Exception as e:
            print(
                f"WebSocket error: {e}. Reconnecting in {backoff:.0f}s...",
                file=sys.stderr,
            )
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, max_backoff)


async def _listen_commands(ws: object) -> None:
    """Listen for inbound command messages from the relay server."""
    import websockets  # type: ignore[import-untyped]

    try:
        async for raw in ws:  # type: ignore[attr-defined]
            try:
                message = json.loads(raw)
                msg_type = message.get("type", "")

                if msg_type.startswith("command:"):
                    ack = handle_command(message)
                    await ws.send(json.dumps(ack))  # type: ignore[attr-defined]
            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"Error handling command: {e}", file=sys.stderr)
    except (websockets.exceptions.ConnectionClosed, asyncio.CancelledError):
        pass


# --- Entry point ---

def main() -> None:
    parser = argparse.ArgumentParser(description="Desk Mirror desktop daemon")
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Output to stdout instead of connecting to relay server",
    )
    args = parser.parse_args()

    if args.stdout:
        run_stdout()
    else:
        asyncio.run(run_websocket())


if __name__ == "__main__":
    main()
