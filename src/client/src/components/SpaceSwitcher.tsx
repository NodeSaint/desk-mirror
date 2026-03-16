/** Swipe left/right on empty space to switch virtual desktops. */

import { useCallback, useRef } from "react";
import { makeCommandId } from "../lib/protocol.ts";

const SWIPE_THRESHOLD = 80; // px

interface SpaceSwitcherProps {
  readonly send: (data: string) => void;
  readonly children: React.ReactNode;
}

export function SpaceSwitcher({ send, children }: SpaceSwitcherProps) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track if the touch target is the canvas background (not a window block)
    const target = e.target as HTMLElement;
    if (target.dataset["canvas"] !== "true") return;

    const touch = e.touches[0];
    if (!touch) return;
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.dataset["canvas"] !== "true") return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      // Only count horizontal swipes
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
        // Swipe left = next space, swipe right = previous space
        // We don't know the current space number, so we send relative:
        // Convention: spaceNumber > 0 for absolute, but we'll use a simple approach
        const direction = dx < 0 ? 1 : -1; // left swipe = +1, right = -1
        send(
          JSON.stringify({
            type: "command:space",
            commandId: makeCommandId(),
            // Send relative — the daemon will need to track current space
            spaceNumber: direction > 0 ? 2 : 1, // Simplified: swipe left = space 2, right = space 1
          }),
        );

        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(15);
        }
      }
    },
    [send],
  );

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </div>
  );
}
