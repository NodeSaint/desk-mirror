/** In-memory layout state management for the relay server. */

import type {
  LayoutFullMessage,
  LayoutDiffMessage,
  WindowData,
  ScreenData,
} from "./types.ts";

export interface LayoutState {
  screen: ScreenData | null;
  windows: Map<string, WindowData>;
  lastTimestamp: number;
}

export function createState(): LayoutState {
  return {
    screen: null,
    windows: new Map(),
    lastTimestamp: 0,
  };
}

/** Replace the entire layout from a layout:full message. */
export function applyFull(state: LayoutState, msg: LayoutFullMessage): void {
  state.screen = msg.screen;
  state.windows.clear();
  for (const w of msg.windows) {
    state.windows.set(w.id, w);
  }
  state.lastTimestamp = msg.timestamp;
}

/** Apply a diff to the current layout state. */
export function applyDiff(state: LayoutState, msg: LayoutDiffMessage): void {
  // Add new windows
  for (const w of msg.added) {
    state.windows.set(w.id, w);
  }

  // Remove closed windows
  for (const id of msg.removed) {
    state.windows.delete(id);
  }

  // Update moved windows
  for (const moved of msg.moved) {
    const existing = state.windows.get(moved.id);
    if (existing) {
      state.windows.set(moved.id, {
        ...existing,
        x: moved.x,
        y: moved.y,
        width: moved.width,
        height: moved.height,
        ...(moved.title !== undefined ? { title: moved.title } : {}),
        ...(moved.isActive !== undefined ? { isActive: moved.isActive } : {}),
        ...(moved.zIndex !== undefined ? { zIndex: moved.zIndex } : {}),
      });
    }
  }

  state.lastTimestamp = msg.timestamp;
}

/** Serialise the current state as a layout:full message. */
export function toFullMessage(state: LayoutState): LayoutFullMessage | null {
  if (!state.screen) return null;
  return {
    type: "layout:full",
    timestamp: state.lastTimestamp,
    screen: state.screen,
    windows: Array.from(state.windows.values()),
  };
}
