"""Data models for Desk Mirror daemon."""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Optional


@dataclass(frozen=True, slots=True)
class Window:
    """A single on-screen window."""

    id: str
    app: str
    title: str
    bundle_id: str
    x: int
    y: int
    width: int
    height: int
    space: int
    is_active: bool
    is_minimised: bool
    colour: str
    z_index: int = 0

    def to_dict(self) -> dict:
        """Serialise to protocol-compatible dict (camelCase keys)."""
        return {
            "id": self.id,
            "app": self.app,
            "title": self.title,
            "bundleId": self.bundle_id,
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
            "space": self.space,
            "isActive": self.is_active,
            "isMinimised": self.is_minimised,
            "colour": self.colour,
            "zIndex": self.z_index,
        }


@dataclass(frozen=True, slots=True)
class Screen:
    """Display information."""

    width: int
    height: int
    scale_factor: float

    def to_dict(self) -> dict:
        return {
            "width": self.width,
            "height": self.height,
            "scaleFactor": self.scale_factor,
        }


@dataclass(frozen=True, slots=True)
class MovedWindow:
    """A window that changed position, size, title, or active state."""

    id: str
    x: int
    y: int
    width: int
    height: int
    title: Optional[str] = None
    is_active: Optional[bool] = None
    z_index: Optional[int] = None

    def to_dict(self) -> dict:
        d: dict = {
            "id": self.id,
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
        }
        if self.title is not None:
            d["title"] = self.title
        if self.is_active is not None:
            d["isActive"] = self.is_active
        if self.z_index is not None:
            d["zIndex"] = self.z_index
        return d


@dataclass(frozen=True, slots=True)
class LayoutDiff:
    """Delta between two layout snapshots."""

    added: list[Window]
    removed: list[str]
    moved: list[MovedWindow]

    @property
    def is_empty(self) -> bool:
        return not self.added and not self.removed and not self.moved

    def to_dict(self) -> dict:
        return {
            "added": [w.to_dict() for w in self.added],
            "removed": self.removed,
            "moved": [m.to_dict() for m in self.moved],
        }
