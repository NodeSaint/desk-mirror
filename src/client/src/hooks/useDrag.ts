/** Touch drag logic for moving window blocks. */

import { useCallback, useRef, useState } from "react";
import type { LayoutMetrics } from "./useLayout.ts";
import { toDesktopCoords } from "./useLayout.ts";
import { makeCommandId } from "../lib/protocol.ts";

interface DragState {
  readonly windowId: string;
  readonly startX: number;
  readonly startY: number;
  readonly offsetX: number;
  readonly offsetY: number;
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
  onFocus: (windowId: string) => void,
  onMove: (windowId: string, x: number, y: number, w: number, h: number) => void,
  onLongPress: (windowId: string) => void,
  windowSizes: Map<string, { width: number; height: number }>,
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

      dragRef.current = {
        windowId,
        startX: touch.clientX,
        startY: touch.clientY,
        offsetX: 0,
        offsetY: 0,
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
    [onLongPress],
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

    dragRef.current = { ...drag, offsetX: dx, offsetY: dy };
    setDragDeltaX(dx);
    setDragDeltaY(dy);
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      clearTimeout(longPressTimerRef.current);
      const drag = dragRef.current;

      if (!drag) return;

      if (isDraggingRef.current && metrics) {
        // Calculate new desktop position
        const touch = e.changedTouches[0];
        if (touch) {
          const newViewportX = touch.clientX - drag.offsetX + drag.startX;
          const newViewportY = touch.clientY - drag.offsetY + drag.startY;

          // Get centre of the drag endpoint
          const endX = touch.clientX;
          const endY = touch.clientY;

          const desktop = toDesktopCoords(endX, endY, metrics);
          const size = windowSizes.get(drag.windowId);
          if (size) {
            // Position so the window centre is at the drop point
            onMove(
              drag.windowId,
              desktop.x - Math.round(size.width / 2),
              desktop.y - Math.round(size.height / 2),
              size.width,
              size.height,
            );
          }
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
    [metrics, onFocus, onMove, windowSizes],
  );

  return { dragging, dragDeltaX, dragDeltaY, onTouchStart, onTouchMove, onTouchEnd };
}
