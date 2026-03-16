"""Tests for the layout differ."""

from __future__ import annotations

import pytest

from ..differ import diff_layouts
from ..models import Window


def _make_window(
    id: str = "w-1",
    app: str = "Terminal",
    title: str = "zsh",
    bundle_id: str = "com.apple.Terminal",
    x: int = 0,
    y: int = 25,
    width: int = 960,
    height: int = 540,
    space: int = 1,
    is_active: bool = False,
    is_minimised: bool = False,
    colour: str = "#00ff41",
) -> Window:
    return Window(
        id=id,
        app=app,
        title=title,
        bundle_id=bundle_id,
        x=x,
        y=y,
        width=width,
        height=height,
        space=space,
        is_active=is_active,
        is_minimised=is_minimised,
        colour=colour,
    )


class TestDiffLayouts:
    """Tests for diff_layouts function."""

    def test_no_change(self) -> None:
        """Identical layouts produce an empty diff."""
        windows = [_make_window(id="w-1"), _make_window(id="w-2", app="Chrome")]
        diff = diff_layouts(windows, windows)
        assert diff.is_empty
        assert diff.added == []
        assert diff.removed == []
        assert diff.moved == []

    def test_window_added(self) -> None:
        """A new window appears in the current snapshot."""
        prev = [_make_window(id="w-1")]
        new_win = _make_window(id="w-2", app="Chrome")
        curr = [_make_window(id="w-1"), new_win]

        diff = diff_layouts(prev, curr)
        assert len(diff.added) == 1
        assert diff.added[0].id == "w-2"
        assert diff.removed == []
        assert diff.moved == []

    def test_window_removed(self) -> None:
        """A window disappears from the current snapshot."""
        prev = [_make_window(id="w-1"), _make_window(id="w-2")]
        curr = [_make_window(id="w-1")]

        diff = diff_layouts(prev, curr)
        assert diff.added == []
        assert diff.removed == ["w-2"]
        assert diff.moved == []

    def test_window_moved(self) -> None:
        """A window changes position by more than the threshold."""
        prev = [_make_window(id="w-1", x=0, y=25)]
        curr = [_make_window(id="w-1", x=100, y=25)]

        diff = diff_layouts(prev, curr)
        assert diff.added == []
        assert diff.removed == []
        assert len(diff.moved) == 1
        assert diff.moved[0].id == "w-1"
        assert diff.moved[0].x == 100

    def test_window_moved_below_threshold(self) -> None:
        """A window that moved less than 5px is not counted as moved."""
        prev = [_make_window(id="w-1", x=0, y=25)]
        curr = [_make_window(id="w-1", x=3, y=25)]

        diff = diff_layouts(prev, curr)
        assert diff.is_empty

    def test_multiple_changes(self) -> None:
        """Added, removed, and moved windows in a single diff."""
        prev = [
            _make_window(id="w-1", x=0),
            _make_window(id="w-2", x=500),
            _make_window(id="w-3", x=1000),
        ]
        curr = [
            _make_window(id="w-1", x=200),   # moved
            # w-2 removed
            _make_window(id="w-3", x=1000),  # unchanged
            _make_window(id="w-4", x=300),   # added
        ]

        diff = diff_layouts(prev, curr)
        assert len(diff.added) == 1
        assert diff.added[0].id == "w-4"
        assert diff.removed == ["w-2"]
        assert len(diff.moved) == 1
        assert diff.moved[0].id == "w-1"

    def test_title_change_detected(self) -> None:
        """A title change is detected even without a position change."""
        prev = [_make_window(id="w-1", title="old title")]
        curr = [_make_window(id="w-1", title="new title")]

        diff = diff_layouts(prev, curr)
        assert len(diff.moved) == 1
        assert diff.moved[0].title == "new title"

    def test_active_state_change(self) -> None:
        """A change in active state is detected."""
        prev = [_make_window(id="w-1", is_active=False)]
        curr = [_make_window(id="w-1", is_active=True)]

        diff = diff_layouts(prev, curr)
        assert len(diff.moved) == 1
        assert diff.moved[0].is_active is True

    def test_serialisation(self) -> None:
        """Diff serialises to protocol-compatible JSON."""
        prev = [_make_window(id="w-1")]
        curr = [_make_window(id="w-1", x=200), _make_window(id="w-2")]

        diff = diff_layouts(prev, curr)
        d = diff.to_dict()

        assert "added" in d
        assert "removed" in d
        assert "moved" in d
        assert len(d["added"]) == 1
        assert d["added"][0]["id"] == "w-2"
        assert d["added"][0]["bundleId"] == "com.apple.Terminal"
        assert d["moved"][0]["id"] == "w-1"
