/** Layout calculation — maps desktop coordinates to phone viewport. */

import { useMemo } from "react";
import type { WindowData, ScreenData } from "../lib/protocol.ts";

export interface ScaledWindow extends WindowData {
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
}

export interface LayoutMetrics {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
}

/** Calculate scaling to fit desktop into viewport while preserving aspect ratio. */
export function calculateMetrics(
  screen: ScreenData,
  viewportWidth: number,
  viewportHeight: number,
): LayoutMetrics {
  const scaleX = viewportWidth / screen.width;
  const scaleY = viewportHeight / screen.height;
  const scale = Math.min(scaleX, scaleY);

  const canvasWidth = screen.width * scale;
  const canvasHeight = screen.height * scale;
  const offsetX = (viewportWidth - canvasWidth) / 2;
  const offsetY = (viewportHeight - canvasHeight) / 2;

  return { scale, offsetX, offsetY, canvasWidth, canvasHeight };
}

/** Scale a window's coordinates from desktop space to viewport space. */
export function scaleWindow(
  window: WindowData,
  metrics: LayoutMetrics,
): ScaledWindow {
  return {
    ...window,
    sx: window.x * metrics.scale + metrics.offsetX,
    sy: window.y * metrics.scale + metrics.offsetY,
    sw: window.width * metrics.scale,
    sh: window.height * metrics.scale,
  };
}

/** Map a viewport coordinate back to desktop space. */
export function toDesktopCoords(
  viewportX: number,
  viewportY: number,
  metrics: LayoutMetrics,
): { x: number; y: number } {
  return {
    x: Math.round((viewportX - metrics.offsetX) / metrics.scale),
    y: Math.round((viewportY - metrics.offsetY) / metrics.scale),
  };
}

/** Hook that returns scaled windows for the current viewport. */
export function useLayout(
  windows: WindowData[],
  screen: ScreenData | null,
  viewportWidth: number,
  viewportHeight: number,
): { windows: ScaledWindow[]; metrics: LayoutMetrics | null } {
  return useMemo(() => {
    if (!screen || viewportWidth === 0 || viewportHeight === 0) {
      return { windows: [], metrics: null };
    }

    const metrics = calculateMetrics(screen, viewportWidth, viewportHeight);
    const scaled = windows.map((w) => scaleWindow(w, metrics));

    return { windows: scaled, metrics };
  }, [windows, screen, viewportWidth, viewportHeight]);
}
