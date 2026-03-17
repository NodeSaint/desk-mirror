/** Desk Mirror — shared TypeScript types matching the WebSocket protocol. */

// --- Data types ---

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
  readonly zIndex: number;
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
  readonly zIndex?: number;
}

// --- Messages: Daemon → Server ---

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

export interface CommandAckMessage {
  readonly type: "command:ack";
  readonly commandId: string;
  readonly success: boolean;
  readonly error?: string | null;
}

// --- Messages: Client → Server → Daemon ---

export interface CommandFocusMessage {
  readonly type: "command:focus";
  readonly commandId: string;
  readonly windowId: string;
}

export interface CommandMoveMessage {
  readonly type: "command:move";
  readonly commandId: string;
  readonly windowId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CommandCloseMessage {
  readonly type: "command:close";
  readonly commandId: string;
  readonly windowId: string;
}

export interface CommandSpaceMessage {
  readonly type: "command:space";
  readonly commandId: string;
  readonly spaceNumber: number;
}

// --- Messages: Server → Client ---

export interface StatusMessage {
  readonly type: "status";
  readonly daemonConnected: boolean;
  readonly clientCount: number;
  readonly latency: number;
  readonly uptime: number;
}

// --- Union types ---

export type DaemonMessage =
  | LayoutFullMessage
  | LayoutDiffMessage
  | CommandAckMessage;

export type ClientCommand =
  | CommandFocusMessage
  | CommandMoveMessage
  | CommandCloseMessage
  | CommandSpaceMessage;

export type ServerToClientMessage =
  | LayoutFullMessage
  | LayoutDiffMessage
  | StatusMessage
  | CommandAckMessage;

export type AnyMessage =
  | DaemonMessage
  | ClientCommand
  | StatusMessage;
