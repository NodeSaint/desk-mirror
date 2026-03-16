/** Settings screen — server URL configuration. */

import { useState, type CSSProperties } from "react";

const STORAGE_KEY = "desk-mirror-server-url";

export function getServerUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveServerUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch {
    // localStorage unavailable
  }
}

interface SettingsProps {
  readonly currentUrl: string;
  readonly onSave: (url: string) => void;
  readonly onClose: () => void;
}

export function Settings({ currentUrl, onSave, onClose }: SettingsProps) {
  const [url, setUrl] = useState(currentUrl);

  const handleSave = () => {
    saveServerUrl(url);
    onSave(url);
  };

  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "#0a0a0a",
    zIndex: 5000,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    color: "white",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    maxWidth: 400,
    padding: "12px 16px",
    fontSize: 16,
    backgroundColor: "#1a1a1a",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    color: "white",
    marginTop: 8,
    marginBottom: 16,
    outline: "none",
  };

  const buttonStyle: CSSProperties = {
    padding: "12px 32px",
    fontSize: 16,
    fontWeight: 600,
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    marginRight: 8,
  };

  const cancelStyle: CSSProperties = {
    ...buttonStyle,
    backgroundColor: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  };

  return (
    <div style={overlayStyle}>
      <h2 style={{ fontSize: 20, marginBottom: 4, fontWeight: 600 }}>
        Desk Mirror
      </h2>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
        Your desktop layout, live on your phone.
      </p>

      <label
        style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", width: "100%", maxWidth: 400 }}
      >
        Server URL
        <input
          style={inputStyle}
          type="url"
          placeholder="ws://100.x.x.x:3847/client"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>

      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 24, maxWidth: 400 }}>
        Enter the WebSocket URL of your relay server. Use your Tailscale IP
        address for cross-device access.
      </p>

      <div>
        <button style={buttonStyle} onClick={handleSave}>
          Connect
        </button>
        {currentUrl && (
          <button style={cancelStyle} onClick={onClose}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
