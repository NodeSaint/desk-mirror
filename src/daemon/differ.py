"""Diff two window layout snapshots to produce a delta update."""

from __future__ import annotations

from .models import LayoutDiff, MovedWindow, Window

# Minimum pixel change to count as a "move"
_MOVE_THRESHOLD = 5


def diff_layouts(
    previous: list[Window],
    current: list[Window],
) -> LayoutDiff:
    """Compare two layout snapshots and return the difference.

    A window counts as "moved" if its x, y, width, or height changed
    by more than 5 pixels, or if its title or active state changed.
    """
    prev_by_id: dict[str, Window] = {w.id: w for w in previous}
    curr_by_id: dict[str, Window] = {w.id: w for w in current}

    prev_ids = set(prev_by_id)
    curr_ids = set(curr_by_id)

    # Added windows: present now but not before
    added = [curr_by_id[wid] for wid in sorted(curr_ids - prev_ids)]

    # Removed windows: were present before but not now
    removed = sorted(prev_ids - curr_ids)

    # Moved / changed windows: present in both, but something changed
    moved: list[MovedWindow] = []
    for wid in sorted(prev_ids & curr_ids):
        old = prev_by_id[wid]
        new = curr_by_id[wid]

        position_changed = (
            abs(new.x - old.x) > _MOVE_THRESHOLD
            or abs(new.y - old.y) > _MOVE_THRESHOLD
            or abs(new.width - old.width) > _MOVE_THRESHOLD
            or abs(new.height - old.height) > _MOVE_THRESHOLD
        )
        title_changed = new.title != old.title
        active_changed = new.is_active != old.is_active
        z_changed = new.z_index != old.z_index

        if position_changed or title_changed or active_changed or z_changed:
            moved.append(
                MovedWindow(
                    id=wid,
                    x=new.x,
                    y=new.y,
                    width=new.width,
                    height=new.height,
                    title=new.title if title_changed else None,
                    is_active=new.is_active if active_changed else None,
                    z_index=new.z_index if z_changed else None,
                )
            )

    return LayoutDiff(added=added, removed=removed, moved=moved)
