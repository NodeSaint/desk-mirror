# Desk Mirror — WebSocket Protocol Specification

> Version: 0.1.0
> Last updated: Sprint 0 (pre-implementation)

---

## Overview

All communication between the daemon, relay server, and phone client uses WebSocket connections with JSON messages. Every message has a `type` field that determines its structure.

---

## Connection Endpoints

| Endpoint | Who Connects | Limit |
|----------|-------------|-------|
| `ws://[host]:[port]/daemon` | Desktop daemon | 1 connection max |
| `ws://[host]:[port]/client` | Phone PWA(s) | Unlimited |

---

## Data Types

### Window

```typescript
interface Window {
  id: string;            // Unique window identifier (stable across polls)
  app: string;           // Application name (e.g., "Terminal")
  title: string;         // Window title (e.g., "~/projects — zsh")
  bundleId: string;      // macOS bundle ID (e.g., "com.apple.Terminal")
  x: number;             // X position in screen pixels (from left)
  y: number;             // Y position in screen pixels (from top)
  width: number;         // Width in screen pixels
  height: number;        // Height in screen pixels
  space: number;         // Virtual desktop / Space number (1-indexed)
  isActive: boolean;     // Whether this is the frontmost window
  isMinimised: boolean;  // Whether the window is minimised to Dock
  colour: string;        // Hex colour assigned by colour mapping
}
```

### Screen

```typescript
interface Screen {
  width: number;         // Screen width in pixels
  height: number;        // Screen height in pixels
  scaleFactor: number;   // Retina scale factor (1 or 2)
}
```

### Diff

```typescript
interface LayoutDiff {
  added: Window[];       // Windows that appeared since last update
  removed: string[];     // Window IDs that disappeared
  moved: MovedWindow[];  // Windows that changed position/size
}

interface MovedWindow {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;        // Include if title changed too
  isActive?: boolean;    // Include if active state changed
}
```

---

## Messages: Daemon → Server

### `layout:full`

Sent on initial connection and whenever a full resync is needed.

```json
{
  "type": "layout:full",
  "timestamp": 1710600000000,
  "screen": { "width": 1920, "height": 1080, "scaleFactor": 2 },
  "windows": [
    {
      "id": "w-12345",
      "app": "Terminal",
      "title": "~/projects — zsh",
      "bundleId": "com.apple.Terminal",
      "x": 0,
      "y": 25,
      "width": 960,
      "height": 540,
      "space": 1,
      "isActive": true,
      "isMinimised": false,
      "colour": "#00ff41"
    }
  ]
}
```

### `layout:diff`

Sent on each poll cycle when changes are detected.

```json
{
  "type": "layout:diff",
  "timestamp": 1710600000300,
  "added": [],
  "removed": ["w-67890"],
  "moved": [
    {
      "id": "w-12345",
      "x": 100,
      "y": 25,
      "width": 960,
      "height": 540
    }
  ]
}
```

### `command:ack`

Sent after executing a command from a client.

```json
{
  "type": "command:ack",
  "commandId": "cmd-abc123",
  "success": true,
  "error": null
}
```

On failure:

```json
{
  "type": "command:ack",
  "commandId": "cmd-abc123",
  "success": false,
  "error": "Window not found"
}
```

---

## Messages: Server → Client

### `layout:full`

Sent immediately when a client connects, and whenever the daemon sends a full resync.

_Same format as daemon → server `layout:full`._

### `layout:diff`

Forwarded from daemon.

_Same format as daemon → server `layout:diff`._

### `status`

Sent to all clients every 5 seconds.

```json
{
  "type": "status",
  "daemonConnected": true,
  "clientCount": 1,
  "latency": 12,
  "uptime": 3600
}
```

### `command:ack`

Forwarded from daemon to the specific client that issued the command.

_Same format as daemon → server `command:ack`._

---

## Messages: Client → Server → Daemon

### `command:focus`

Bring a window to the front.

```json
{
  "type": "command:focus",
  "commandId": "cmd-abc123",
  "windowId": "w-12345"
}
```

### `command:move`

Reposition and/or resize a window.

```json
{
  "type": "command:move",
  "commandId": "cmd-abc124",
  "windowId": "w-12345",
  "x": 200,
  "y": 100,
  "width": 800,
  "height": 600
}
```

### `command:close`

Close a window.

```json
{
  "type": "command:close",
  "commandId": "cmd-abc125",
  "windowId": "w-12345"
}
```

### `command:space`

Switch to a virtual desktop / Space.

```json
{
  "type": "command:space",
  "commandId": "cmd-abc126",
  "spaceNumber": 2
}
```

---

## Error Handling

### Malformed Messages

If a message cannot be parsed as JSON or is missing the `type` field, the server drops it silently and logs a warning. No error is sent back.

### Unknown Message Types

Dropped silently. Logged at debug level.

### Daemon Disconnection

When the daemon disconnects, the server immediately sends to all clients:

```json
{
  "type": "status",
  "daemonConnected": false,
  "clientCount": 1,
  "latency": -1,
  "uptime": 3600
}
```

### Client Disconnection

The server removes the client from its pool. No message is sent to other clients or the daemon.

---

## Command ID Convention

Command IDs are generated by the client and must be unique per session. Recommended format:

```
cmd-[random-8-chars]
```

Example: `cmd-a1b2c3d4`

The server does not validate uniqueness — it simply forwards the ID.

---

## Timing

| Event | Target |
|-------|--------|
| Daemon poll interval | 300ms (configurable) |
| Status broadcast interval | 5000ms |
| Client reconnect backoff | 1s, 2s, 4s, 8s, 16s, 30s max |
| Layout update latency (end-to-end) | < 500ms |
