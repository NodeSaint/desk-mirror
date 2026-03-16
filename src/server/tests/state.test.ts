import { describe, it, expect } from "vitest";
import { createState, applyFull, applyDiff, toFullMessage } from "../state.ts";
import type { LayoutFullMessage, LayoutDiffMessage } from "../types.ts";

const screen = { width: 1920, height: 1080, scaleFactor: 2 } as const;

const window1 = {
  id: "w-1",
  app: "Terminal",
  title: "zsh",
  bundleId: "com.apple.Terminal",
  x: 0,
  y: 25,
  width: 960,
  height: 540,
  space: 1,
  isActive: true,
  isMinimised: false,
  colour: "#00ff41",
} as const;

const window2 = {
  id: "w-2",
  app: "Chrome",
  title: "Google",
  bundleId: "com.google.Chrome",
  x: 960,
  y: 25,
  width: 960,
  height: 540,
  space: 1,
  isActive: false,
  isMinimised: false,
  colour: "#4285f4",
} as const;

describe("state — applyFull", () => {
  it("stores screen and windows from a full message", () => {
    const state = createState();
    const msg: LayoutFullMessage = {
      type: "layout:full",
      timestamp: 1000,
      screen,
      windows: [window1, window2],
    };

    applyFull(state, msg);

    expect(state.screen).toEqual(screen);
    expect(state.windows.size).toBe(2);
    expect(state.windows.get("w-1")).toEqual(window1);
    expect(state.lastTimestamp).toBe(1000);
  });

  it("replaces previous state on second full message", () => {
    const state = createState();
    applyFull(state, {
      type: "layout:full",
      timestamp: 1000,
      screen,
      windows: [window1, window2],
    });

    applyFull(state, {
      type: "layout:full",
      timestamp: 2000,
      screen,
      windows: [window1],
    });

    expect(state.windows.size).toBe(1);
    expect(state.windows.has("w-2")).toBe(false);
    expect(state.lastTimestamp).toBe(2000);
  });
});

describe("state — applyDiff", () => {
  it("adds new windows", () => {
    const state = createState();
    applyFull(state, {
      type: "layout:full",
      timestamp: 1000,
      screen,
      windows: [window1],
    });

    const diff: LayoutDiffMessage = {
      type: "layout:diff",
      timestamp: 2000,
      added: [window2],
      removed: [],
      moved: [],
    };

    applyDiff(state, diff);

    expect(state.windows.size).toBe(2);
    expect(state.windows.get("w-2")).toEqual(window2);
  });

  it("removes closed windows", () => {
    const state = createState();
    applyFull(state, {
      type: "layout:full",
      timestamp: 1000,
      screen,
      windows: [window1, window2],
    });

    applyDiff(state, {
      type: "layout:diff",
      timestamp: 2000,
      added: [],
      removed: ["w-2"],
      moved: [],
    });

    expect(state.windows.size).toBe(1);
    expect(state.windows.has("w-2")).toBe(false);
  });

  it("updates moved windows", () => {
    const state = createState();
    applyFull(state, {
      type: "layout:full",
      timestamp: 1000,
      screen,
      windows: [window1],
    });

    applyDiff(state, {
      type: "layout:diff",
      timestamp: 2000,
      added: [],
      removed: [],
      moved: [{ id: "w-1", x: 100, y: 50, width: 960, height: 540 }],
    });

    const updated = state.windows.get("w-1");
    expect(updated?.x).toBe(100);
    expect(updated?.y).toBe(50);
    // Unchanged fields preserved
    expect(updated?.app).toBe("Terminal");
    expect(updated?.colour).toBe("#00ff41");
  });

  it("updates title when included in moved", () => {
    const state = createState();
    applyFull(state, {
      type: "layout:full",
      timestamp: 1000,
      screen,
      windows: [window1],
    });

    applyDiff(state, {
      type: "layout:diff",
      timestamp: 2000,
      added: [],
      removed: [],
      moved: [
        { id: "w-1", x: 0, y: 25, width: 960, height: 540, title: "vim" },
      ],
    });

    expect(state.windows.get("w-1")?.title).toBe("vim");
  });

  it("handles combined add, remove, and move", () => {
    const state = createState();
    applyFull(state, {
      type: "layout:full",
      timestamp: 1000,
      screen,
      windows: [window1, window2],
    });

    const window3 = { ...window1, id: "w-3", app: "Finder" };

    applyDiff(state, {
      type: "layout:diff",
      timestamp: 2000,
      added: [window3],
      removed: ["w-2"],
      moved: [{ id: "w-1", x: 200, y: 25, width: 960, height: 540 }],
    });

    expect(state.windows.size).toBe(2);
    expect(state.windows.has("w-2")).toBe(false);
    expect(state.windows.get("w-3")?.app).toBe("Finder");
    expect(state.windows.get("w-1")?.x).toBe(200);
  });
});

describe("state — toFullMessage", () => {
  it("returns null when state is empty", () => {
    const state = createState();
    expect(toFullMessage(state)).toBeNull();
  });

  it("serialises current state as a layout:full message", () => {
    const state = createState();
    applyFull(state, {
      type: "layout:full",
      timestamp: 1000,
      screen,
      windows: [window1],
    });

    const msg = toFullMessage(state);
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe("layout:full");
    expect(msg?.screen).toEqual(screen);
    expect(msg?.windows).toHaveLength(1);
    expect(msg?.windows[0]?.id).toBe("w-1");
  });
});
