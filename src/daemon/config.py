"""Configuration for the Desk Mirror daemon."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


# Walk up from this file to find the repo root config.json
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_CONFIG_PATH = _REPO_ROOT / "config.json"


def _load_file_config() -> dict[str, Any]:
    """Load config.json from the repository root."""
    if _CONFIG_PATH.exists():
        with open(_CONFIG_PATH) as f:
            return json.load(f)
    return {}


_file_config = _load_file_config()

# Polling interval in seconds
POLL_INTERVAL: float = float(
    os.environ.get("DESK_MIRROR_POLL_INTERVAL", _file_config.get("pollInterval", 300))
) / 1000  # config is in ms, convert to seconds

# Relay server connection (used in Sprint 2)
SERVER_HOST: str = os.environ.get("DESK_MIRROR_SERVER_HOST", "localhost")
SERVER_PORT: int = int(
    os.environ.get("DESK_MIRROR_SERVER_PORT", _file_config.get("port", 3847))
)

# Colour mapping: bundle_id → hex colour
COLOURS: dict[str, str] = _file_config.get("colours", {})
DEFAULT_COLOUR: str = _file_config.get("defaultColour", "#6c757d")

# Filter settings
_filters = _file_config.get("filters", {})
IGNORE_APPS: set[str] = set(_filters.get("ignoreApps", []))
MIN_WIDTH: int = _filters.get("minWidth", 50)
MIN_HEIGHT: int = _filters.get("minHeight", 50)


def colour_for_bundle(bundle_id: str) -> str:
    """Return the colour for a given bundle ID, or the default."""
    return COLOURS.get(bundle_id, DEFAULT_COLOUR)
