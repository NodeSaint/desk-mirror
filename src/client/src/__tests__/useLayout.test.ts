import { describe, it, expect } from "vitest";
import { calculateMetrics, scaleWindow, toDesktopCoords } from "../hooks/useLayout.ts";
import type { WindowData, ScreenData } from "../lib/protocol.ts";

const screen: ScreenData = { width: 1920, height: 1080, scaleFactor: 2 };

const window1: WindowData = {
  id: "w-1",
  app: "Terminal",
  title: "zsh",
  bundleId: "com.apple.Terminal",
  x: 0,
  y: 0,
  width: 960,
  height: 540,
  space: 1,
  isActive: true,
  isMinimised: false,
  colour: "#00ff41",
};

describe("calculateMetrics", () => {
  it("scales desktop to fit a portrait phone viewport", () => {
    // Typical iPhone viewport: 390 x 844
    const m = calculateMetrics(screen, 390, 844);

    // Width is the constraining dimension: 390 / 1920 ≈ 0.203
    expect(m.scale).toBeCloseTo(390 / 1920, 3);
    expect(m.canvasWidth).toBeCloseTo(390, 0);
    // Canvas height = 1080 * scale < 844, so vertical centering
    expect(m.canvasHeight).toBeLessThan(844);
    expect(m.offsetX).toBeCloseTo(0, 0);
    expect(m.offsetY).toBeGreaterThan(0);
  });

  it("scales desktop to fit a landscape phone viewport", () => {
    // Landscape: 844 x 390
    const m = calculateMetrics(screen, 844, 390);

    // Height is constraining: 390 / 1080 ≈ 0.361
    expect(m.scale).toBeCloseTo(390 / 1080, 3);
    expect(m.canvasHeight).toBeCloseTo(390, 0);
    expect(m.offsetY).toBeCloseTo(0, 0);
    expect(m.offsetX).toBeGreaterThan(0);
  });

  it("preserves aspect ratio", () => {
    const m = calculateMetrics(screen, 390, 844);

    const aspectDesktop = screen.width / screen.height;
    const aspectCanvas = m.canvasWidth / m.canvasHeight;

    expect(aspectCanvas).toBeCloseTo(aspectDesktop, 2);
  });
});

describe("scaleWindow", () => {
  it("maps desktop coordinates to viewport coordinates", () => {
    const m = calculateMetrics(screen, 390, 844);
    const scaled = scaleWindow(window1, m);

    expect(scaled.sx).toBeCloseTo(m.offsetX, 0);
    expect(scaled.sy).toBeCloseTo(m.offsetY, 0);
    expect(scaled.sw).toBeCloseTo(960 * m.scale, 0);
    expect(scaled.sh).toBeCloseTo(540 * m.scale, 0);
  });

  it("positions a window at the right edge correctly", () => {
    const rightWindow: WindowData = {
      ...window1,
      x: 960,
      y: 0,
    };
    const m = calculateMetrics(screen, 390, 844);
    const scaled = scaleWindow(rightWindow, m);

    // Should be at the middle of the canvas
    expect(scaled.sx).toBeCloseTo(960 * m.scale + m.offsetX, 0);
  });
});

describe("toDesktopCoords", () => {
  it("inverse-maps viewport coordinates back to desktop", () => {
    const m = calculateMetrics(screen, 390, 844);

    // Top-left of canvas
    const tl = toDesktopCoords(m.offsetX, m.offsetY, m);
    expect(tl.x).toBe(0);
    expect(tl.y).toBe(0);

    // Bottom-right of canvas
    const br = toDesktopCoords(
      m.offsetX + m.canvasWidth,
      m.offsetY + m.canvasHeight,
      m,
    );
    expect(br.x).toBe(screen.width);
    expect(br.y).toBe(screen.height);
  });

  it("round-trips through scale and back", () => {
    const m = calculateMetrics(screen, 390, 844);
    const scaled = scaleWindow(window1, m);
    const back = toDesktopCoords(scaled.sx, scaled.sy, m);

    expect(back.x).toBe(window1.x);
    expect(back.y).toBe(window1.y);
  });
});
