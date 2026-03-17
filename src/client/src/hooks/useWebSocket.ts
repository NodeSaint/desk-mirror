/** WebSocket connection management with auto-reconnect. */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ServerMessage,
  LayoutFullMessage,
  LayoutDiffMessage,
  StatusMessage,
  WindowData,
  ScreenData,
} from "../lib/protocol.ts";

export interface ConnectionState {
  readonly connected: boolean;
  readonly daemonConnected: boolean;
  readonly latency: number;
  readonly clientCount: number;
}

export interface LayoutState {
  readonly screen: ScreenData | null;
  readonly windows: WindowData[];
}

interface UseWebSocketReturn {
  readonly connection: ConnectionState;
  readonly layout: LayoutState;
  readonly send: (data: string) => void;
}

function applyDiff(
  windows: WindowData[],
  diff: LayoutDiffMessage,
): WindowData[] {
  const byId = new Map(windows.map((w) => [w.id, w]));

  // Remove
  for (const id of diff.removed) {
    byId.delete(id);
  }

  // Add
  for (const w of diff.added) {
    byId.set(w.id, w);
  }

  // Move
  for (const m of diff.moved) {
    const existing = byId.get(m.id);
    if (existing) {
      byId.set(m.id, {
        ...existing,
        x: m.x,
        y: m.y,
        width: m.width,
        height: m.height,
        ...(m.title !== undefined ? { title: m.title } : {}),
        ...(m.isActive !== undefined ? { isActive: m.isActive } : {}),
        ...(m.zIndex !== undefined ? { zIndex: m.zIndex } : {}),
      });
    }
  }

  return Array.from(byId.values());
}

export function useWebSocket(url: string | null): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [connection, setConnection] = useState<ConnectionState>({
    connected: false,
    daemonConnected: false,
    latency: -1,
    clientCount: 0,
  });

  const [layout, setLayout] = useState<LayoutState>({
    screen: null,
    windows: [],
  });

  const send = useCallback((data: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }, []);

  useEffect(() => {
    if (!url) return;

    let mounted = true;

    function connect() {
      if (!mounted) return;

      const ws = new WebSocket(url!);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mounted) return;
        backoffRef.current = 1000;
        setConnection((prev) => ({ ...prev, connected: true }));
      };

      ws.onmessage = (event) => {
        if (!mounted) return;
        try {
          const msg = JSON.parse(event.data as string) as ServerMessage;

          switch (msg.type) {
            case "layout:full": {
              const full = msg as LayoutFullMessage;
              setLayout({
                screen: full.screen,
                windows: [...full.windows],
              });
              break;
            }
            case "layout:diff": {
              const diff = msg as LayoutDiffMessage;
              setLayout((prev) => ({
                ...prev,
                windows: applyDiff(prev.windows, diff),
              }));
              break;
            }
            case "status": {
              const status = msg as StatusMessage;
              setConnection((prev) => ({
                ...prev,
                daemonConnected: status.daemonConnected,
                latency: status.latency,
                clientCount: status.clientCount,
              }));
              break;
            }
          }
        } catch {
          // Malformed message — ignore
        }
      };

      ws.onclose = () => {
        if (!mounted) return;
        wsRef.current = null;
        setConnection((prev) => ({ ...prev, connected: false }));

        // Auto-reconnect with exponential backoff
        const delay = backoffRef.current;
        backoffRef.current = Math.min(delay * 2, 30000);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire after this
      };
    }

    connect();

    return () => {
      mounted = false;
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [url]);

  return { connection, layout, send };
}
