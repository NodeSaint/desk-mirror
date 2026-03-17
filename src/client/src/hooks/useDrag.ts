/** Touch drag logic for moving window blocks. */

import { useCallback, useRef, useState } from "react";
import type { LayoutMetrics } from "./useLayout.ts";
import type { ScreenData } from "../lib/protocol.ts";

interface DragState {
  readonly windowId: string;
  readonly startX: number;
  readonly startY: number;
  /** Original desktop position of the window when drag started. */
  readonly origDesktopX: number;
  readonly origDesktopY: number;
  readonly desktopWidth: number;
  readonly desktopHeight: number;
}

interface UseDragReturn {
  readonly dragging: string | null;
  readonly dragDeltaX: number;
  readonly dragDeltaY: number;
  readonly onTouchStart: (windowId: string, e: React.TouchEvent) => void;
  readonly onTouchMove: (e: React.TouchEvent) => void;
  readonly onTouchEnd: (e: React.TouchEvent) => void;
}

const DRAG_THRESHOLD = 8; // px before a touch counts as a drag
const LONG_PRESS_MS = 500;

export function useDrag(
  metrics: LayoutMetrics | null,
  screen: ScreenData | null,
  onFocus: (windowId: string) => void,
  onMove: (windowId: string, x: number, y: number, w: number, h: number) => void,
  onLongPress: (windowId: string) => void,
  windowPositions: Map<string, { x: number; y: number; width: number; height: number }>,
): UseDragReturn {
  const dragRef = useRef<DragState | null>(null);
  const isDraggingRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const [dragDeltaY, setDragDeltaY] = useState(0);

  const onTouchStart = useCallback(
    (windowId: string, e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      const pos = windowPositions.get(windowId);
      if (!pos) return;

      dragRef.current = {
        windowId,
        startX: touch.clientX,
        startY: touch.clientY,
        origDesktopX: pos.x,
        origDesktopY: pos.y,
        desktopWidth: pos.width,
        desktopHeight: pos.height,
      };
      isDraggingRef.current = false;
      setDragDeltaX(0);
      setDragDeltaY(0);

      // Long press detection
      longPressTimerRef.current = setTimeout(() => {
        if (!isDraggingRef.current && dragRef.current) {
          onLongPress(windowId);
          dragRef.current = null;
        }
      }, LONG_PRESS_MS);
    },
    [onLongPress, windowPositions],
  );

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const drag = dragRef.current;
    const touch = e.touches[0];
    if (!drag || !touch) return;

    const dx = touch.clientX - drag.startX;
    const dy = touch.clientY - drag.startY;

    if (!isDraggingRef.current) {
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        isDraggingRef.current = true;
        clearTimeout(longPressTimerRef.current);
        setDragging(drag.windowId);
      }
      return;
    }

    setDragDeltaX(dx);
    setDragDeltaY(dy);
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      clearTimeout(longPressTimerRef.current);
      const drag = dragRef.current;

      if (!drag) return;

      if (isDraggingRef.current && metrics && screen) {
        // Convert viewport drag delta to desktop space delta
        const deltaDesktopX = Math.round(
          (e.changedTouches[0]!.clientX - drag.startX) / metrics.scale,
        );
        const deltaDesktopY = Math.round(
          (e.changedTouches[0]!.clientY - drag.startY) / metrics.scale,
        );

        // New desktop position = original + delta
        let newX = drag.origDesktopX + deltaDesktopX;
        let newY = drag.origDesktopY + deltaDesktopY;

        // Clamp to screen boundaries — keep at least 50px visible
        const minVisible = 50;
        newX = Math.max(-drag.desktopWidth + minVisible, Math.min(newX, screen.width - minVisible));
        newY = Math.max(0, Math.min(newY, screen.height - minVisible));

        onMove(
          drag.windowId,
          newX,
          newY,
          drag.desktopWidth,
          drag.desktopHeight,
        );

        // Haptic on drop
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      } else if (!isDraggingRef.current) {
        // It was a tap
        onFocus(drag.windowId);
      }

      dragRef.current = null;
      isDraggingRef.current = false;
      setDragging(null);
      setDragDeltaX(0);
      setDragDeltaY(0);
    },
    [metrics, screen, onFocus, onMove],
  );

  return { dragging, dragDeltaX, dragDeltaY, onTouchStart, onTouchMove, onTouchEnd };
}
