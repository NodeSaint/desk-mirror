/** WebSocket message type definitions matching the Desk Mirror protocol. */

export interface WindowData {
  readonly id: string;
  readonly app: string;
  readonly title: string;
  readonly bundleId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly space: number;
  readonly isActive: boolean;
  readonly isMinimised: boolean;
  readonly colour: string;
}

export interface ScreenData {
  readonly width: number;
  readonly height: number;
  readonly scaleFactor: number;
}

export interface MovedWindowData {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly title?: string;
  readonly isActive?: boolean;
}

export interface LayoutFullMessage {
  readonly type: "layout:full";
  readonly timestamp: number;
  readonly screen: ScreenData;
  readonly windows: readonly WindowData[];
}

export interface LayoutDiffMessage {
  readonly type: "layout:diff";
  readonly timestamp: number;
  readonly added: readonly WindowData[];
  readonly removed: readonly string[];
  readonly moved: readonly MovedWindowData[];
}

export interface StatusMessage {
  readonly type: "status";
  readonly daemonConnected: boolean;
  readonly clientCount: number;
  readonly latency: number;
  readonly uptime: number;
}

export interface CommandAckMessage {
  readonly type: "command:ack";
  readonly commandId: string;
  readonly success: boolean;
  readonly error?: string | null;
}

export type ServerMessage =
  | LayoutFullMessage
  | LayoutDiffMessage
  | StatusMessage
  | CommandAckMessage;

/** Generate a unique command ID. */
export function makeCommandId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "cmd-";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
