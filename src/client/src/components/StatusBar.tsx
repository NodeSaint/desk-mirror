/** Connection status bar at top of screen. */

import { memo, type CSSProperties } from "react";
import type { ConnectionState } from "../hooks/useWebSocket.ts";

interface StatusBarProps {
  readonly connection: ConnectionState;
  readonly onSettingsClick: () => void;
}

export const StatusBar = memo(function StatusBar({
  connection,
  onSettingsClick,
}: StatusBarProps) {
  const { connected, daemonConnected, latency } = connection;

  const isHealthy = connected && daemonConnected;
  const dotColour = isHealthy ? "#34c759" : connected ? "#ff9500" : "#ff3b30";

  const label = !connected
    ? "Disconnected"
    : !daemonConnected
      ? "Waiting for daemon..."
      : latency >= 0
        ? `${latency}ms`
        : "Connected";

  const barStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: "rgba(10, 10, 10, 0.9)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    zIndex: 2000,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  };

  const dotStyle: CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: "50%",
    backgroundColor: dotColour,
    marginRight: 6,
    boxShadow: `0 0 4px ${dotColour}`,
  };

  const gearStyle: CSSProperties = {
    background: "none",
    border: "none",
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 16,
    cursor: "pointer",
    padding: 4,
    lineHeight: 1,
  };

  return (
    <div style={barStyle}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={dotStyle} />
        <span>{label}</span>
      </div>
      <button style={gearStyle} onClick={onSettingsClick} aria-label="Settings">
        &#9881;
      </button>
    </div>
  );
});
