/** Main layout renderer — positions window blocks on the canvas. */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { LayoutState, ConnectionState } from "../hooks/useWebSocket.ts";
import { useLayout } from "../hooks/useLayout.ts";
import { useDrag } from "../hooks/useDrag.ts";
import { WindowBlock } from "./WindowBlock.tsx";
import { StatusBar } from "./StatusBar.tsx";
import { SpaceSwitcher } from "./SpaceSwitcher.tsx";
import { makeCommandId } from "../lib/protocol.ts";

interface DesktopCanvasProps {
  readonly layout: LayoutState;
  readonly connection: ConnectionState;
  readonly send: (data: string) => void;
  readonly onSettingsClick: () => void;
}

export function DesktopCanvas({
  layout,
  connection,
  send,
  onSettingsClick,
}: DesktopCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Track viewport size
  useEffect(() => {
    function update() {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight - 32); // Account for status bar
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { windows: scaledWindows, metrics } = useLayout(
    layout.windows,
    layout.screen,
    viewportWidth,
    viewportHeight,
  );

  // Window desktop positions for drag calculations
  const windowPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; width: number; height: number }>();
    for (const w of layout.windows) {
      map.set(w.id, { x: w.x, y: w.y, width: w.width, height: w.height });
    }
    return map;
  }, [layout.windows]);

  const handleFocus = useCallback(
    (windowId: string) => {
      send(
        JSON.stringify({
          type: "command:focus",
          commandId: makeCommandId(),
          windowId,
        }),
      );
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    },
    [send],
  );

  const handleMove = useCallback(
    (windowId: string, x: number, y: number, w: number, h: number) => {
      send(
        JSON.stringify({
          type: "command:move",
          commandId: makeCommandId(),
          windowId,
          x,
          y,
          width: w,
          height: h,
        }),
      );
    },
    [send],
  );

  const [longPressWindow, setLongPressWindow] = useState<string | null>(null);

  const handleLongPress = useCallback((windowId: string) => {
    setLongPressWindow(windowId);
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }, []);

  const { dragging, dragDeltaX, dragDeltaY, onTouchStart, onTouchMove, onTouchEnd } =
    useDrag(metrics, layout.screen, handleFocus, handleMove, handleLongPress, windowPositions);

  const handleClose = useCallback(
    (windowId: string) => {
      send(
        JSON.stringify({
          type: "command:close",
          commandId: makeCommandId(),
          windowId,
        }),
      );
      setLongPressWindow(null);
    },
    [send],
  );

  const canvasStyle: CSSProperties = {
    position: "relative",
    width: "100vw",
    height: "calc(100vh - 32px)",
    marginTop: 32,
    backgroundColor: "#0a0a0a",
    overflow: "hidden",
    touchAction: "none",
  };

  const disconnectedStyle: CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 14,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    textAlign: "center",
  };

  const contextMenuStyle: CSSProperties = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    backdropFilter: "blur(12px)",
    borderRadius: 12,
    padding: "8px 0",
    zIndex: 3000,
    minWidth: 160,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
  };

  const menuItemStyle: CSSProperties = {
    display: "block",
    width: "100%",
    padding: "12px 20px",
    background: "none",
    border: "none",
    color: "white",
    fontSize: 16,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    textAlign: "left",
    cursor: "pointer",
  };

  const showEmpty = !connection.connected || layout.windows.length === 0;

  return (
    <>
      <StatusBar connection={connection} onSettingsClick={onSettingsClick} />
      <SpaceSwitcher send={send}>
        <div
          ref={containerRef}
          style={canvasStyle}
          data-canvas="true"
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {showEmpty && (
            <div style={disconnectedStyle}>
              {!connection.connected
                ? "Connecting..."
                : !connection.daemonConnected
                  ? "Waiting for desktop daemon..."
                  : "No windows"}
            </div>
          )}

          {scaledWindows.map((w) => (
            <WindowBlock
              key={w.id}
              window={w}
              isDragging={dragging === w.id}
              dragDeltaX={dragging === w.id ? dragDeltaX : 0}
              dragDeltaY={dragging === w.id ? dragDeltaY : 0}
              onTouchStart={onTouchStart}
            />
          ))}

          {/* Long press context menu */}
          {longPressWindow && (
            <>
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0,0.3)",
                  zIndex: 2999,
                }}
                onClick={() => setLongPressWindow(null)}
                onTouchEnd={() => setLongPressWindow(null)}
              />
              <div style={contextMenuStyle}>
                <button
                  style={menuItemStyle}
                  onClick={() => {
                    handleFocus(longPressWindow);
                    setLongPressWindow(null);
                  }}
                >
                  Focus
                </button>
                <button
                  style={{ ...menuItemStyle, color: "#ff453a" }}
                  onClick={() => handleClose(longPressWindow)}
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </SpaceSwitcher>
    </>
  );
}
