/** Desk Mirror — Phone PWA root component. */

import { useCallback, useEffect, useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket.ts";
import { DesktopCanvas } from "./components/DesktopCanvas.tsx";
import { Settings, getServerUrl, saveServerUrl } from "./components/Settings.tsx";

export default function App() {
  const [serverUrl, setServerUrl] = useState(getServerUrl);
  const [showSettings, setShowSettings] = useState(!serverUrl);

  const { connection, layout, send } = useWebSocket(
    serverUrl || null,
  );

  const handleSaveUrl = useCallback((url: string) => {
    saveServerUrl(url);
    setServerUrl(url);
    setShowSettings(false);
  }, []);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed — app still works
      });
    }
  }, []);

  if (showSettings) {
    return (
      <Settings
        currentUrl={serverUrl}
        onSave={handleSaveUrl}
        onClose={() => setShowSettings(false)}
      />
    );
  }

  return (
    <DesktopCanvas
      layout={layout}
      connection={connection}
      send={send}
      onSettingsClick={() => setShowSettings(true)}
    />
  );
}
