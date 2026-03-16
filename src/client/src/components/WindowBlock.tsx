/** Individual window block — coloured rectangle with app info. */

import { type CSSProperties, memo } from "react";
import type { ScaledWindow } from "../hooks/useLayout.ts";
import { appInitial, lightenColour } from "../lib/colours.ts";

interface WindowBlockProps {
  readonly window: ScaledWindow;
  readonly isDragging: boolean;
  readonly dragDeltaX: number;
  readonly dragDeltaY: number;
  readonly onTouchStart: (windowId: string, e: React.TouchEvent) => void;
}

export const WindowBlock = memo(function WindowBlock({
  window: w,
  isDragging,
  dragDeltaX,
  dragDeltaY,
  onTouchStart,
}: WindowBlockProps) {
  const textColour = lightenColour(w.colour, 0.6);

  const style: CSSProperties = {
    position: "absolute",
    left: w.sx + (isDragging ? dragDeltaX : 0),
    top: w.sy + (isDragging ? dragDeltaY : 0),
    width: w.sw,
    height: w.sh,
    backgroundColor: w.colour,
    borderRadius: 8,
    border: w.isActive
      ? "2px solid rgba(255, 255, 255, 0.9)"
      : "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: w.isActive
      ? `0 0 12px ${w.colour}80, 0 2px 8px rgba(0,0,0,0.3)`
      : "0 2px 4px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    transition: isDragging ? "none" : "left 0.2s ease-out, top 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out, opacity 0.15s ease-out",
    animation: "block-appear 0.15s ease-out",
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : w.isActive ? 10 : 1,
    touchAction: "none",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  const initialStyle: CSSProperties = {
    fontSize: Math.min(w.sw * 0.4, w.sh * 0.4, 32),
    fontWeight: 700,
    color: textColour,
    lineHeight: 1,
    opacity: 0.9,
  };

  const titleStyle: CSSProperties = {
    position: "absolute",
    bottom: 2,
    left: 4,
    right: 4,
    fontSize: Math.min(10, w.sh * 0.15),
    color: textColour,
    opacity: 0.7,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "center",
  };

  // Only show title if block is big enough
  const showTitle = w.sh > 30 && w.sw > 40;

  return (
    <div
      style={style}
      onTouchStart={(e) => onTouchStart(w.id, e)}
    >
      {w.sh > 20 && w.sw > 20 && (
        <span style={initialStyle}>{appInitial(w.app)}</span>
      )}
      {showTitle && w.title && (
        <span style={titleStyle}>{w.title}</span>
      )}
    </div>
  );
});
