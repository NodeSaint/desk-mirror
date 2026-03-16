# DESK MIRROR — CLAUDE.md

## Project Identity

**Name:** Desk Mirror
**Tagline:** Your desktop layout, live on your phone.
**Repo:** desk-mirror
**License:** MIT

## What This Is

A real-time desktop window minimap that mirrors your screen layout onto your phone as interactive coloured blocks. Tap to focus windows, drag to rearrange, swipe to switch spaces. Runs entirely on your local network via Tailscale — zero cloud, zero telemetry, fully private.

## Architecture Overview

```
┌─────────────────┐     WebSocket      ┌─────────────────┐     WebSocket      ┌─────────────────┐
│  DESKTOP DAEMON  │ ──────────────────▶│   RELAY SERVER   │◀────────────────── │   PHONE PWA     │
│  (Python)        │                    │   (Node.js)      │                    │   (React/Vite)  │
│                  │◀──────────────────│                  │──────────────────▶│                  │
│  Reads windows   │     Commands       │  Broadcasts      │     Layout data    │  Renders blocks │
│  Executes cmds   │                    │  Routes cmds     │                    │  Touch controls │
└─────────────────┘                    └─────────────────┘                    └─────────────────┘
         │                                      │                                      │
         └──────────────────────────────────────┴──────────────────────────────────────┘
                                    All on Tailscale network
```

## Tech Stack

| Component       | Tech                        | Why                                                    |
|-----------------|-----------------------------|---------------------------------------------------------|
| Desktop Daemon  | Python 3.11+, pyobjc       | Best macOS Accessibility API bindings                  |
| Relay Server    | Node.js 20+, ws, Express   | Lightweight, fast WebSocket broadcasting               |
| Phone Client    | React 18, Vite, TypeScript  | PWA-capable, fast dev cycle, touch events built-in     |
| Networking      | Tailscale                   | Already running, zero-config secure mesh               |
| Process Comms   | WebSocket (JSON)            | Real-time bidirectional, works natively in browsers    |

## Directory Structure

```
desk-mirror/
├── CLAUDE.md              ← You are here
├── PRIMER.md              ← Session state — read first, update last
├── GITHUB.md              ← Git tracking rules and push log
├── SPRINTS.md             ← All sprint prompts in sequence
├── AGENTS.md              ← Agent role definitions
├── README.md              ← Public-facing project README
├── package.json           ← Root workspace config
├── src/
│   ├── daemon/            ← Python desktop daemon
│   │   ├── main.py        ← Entry point — poll loop + WebSocket client
│   │   ├── platforms/
│   │   │   ├── macos.py   ← macOS window reader (pyobjc + Accessibility)
│   │   │   └── linux.py   ← Linux window reader (wmctrl/xdotool) [stretch]
│   │   ├── commands.py    ← Execute inbound commands (focus, move, close)
│   │   ├── differ.py      ← Diff window state, only send changes
│   │   └── requirements.txt
│   ├── server/            ← Node.js WebSocket relay
│   │   ├── index.ts       ← Express + ws server
│   │   ├── types.ts       ← Shared TypeScript types
│   │   ├── rooms.ts       ← Connection/session management
│   │   └── package.json
│   └── client/            ← React PWA
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── DesktopCanvas.tsx   ← Main layout renderer
│       │   │   ├── WindowBlock.tsx     ← Individual window block
│       │   │   ├── SpaceSwitcher.tsx   ← Virtual desktop swipe nav
│       │   │   └── StatusBar.tsx       ← Connection status + info
│       │   ├── hooks/
│       │   │   ├── useWebSocket.ts     ← WS connection management
│       │   │   ├── useDrag.ts          ← Touch drag logic
│       │   │   └── useLayout.ts        ← Layout calculation + scaling
│       │   ├── lib/
│       │   │   ├── colours.ts          ← App-to-colour mapping
│       │   │   └── protocol.ts         ← Message type definitions
│       │   └── styles/
│       │       └── global.css
│       ├── public/
│       │   ├── manifest.json           ← PWA manifest
│       │   └── sw.js                   ← Service worker
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
└── docs/
    └── PROTOCOL.md         ← WebSocket message format spec
```

## Data Model — Window Object

```json
{
  "id": "window-12345",
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
  "colour": "#1a1a2e"
}
```

## WebSocket Protocol

All messages are JSON with a `type` field.

### Daemon → Server

| Type              | Payload                          | Description                    |
|-------------------|----------------------------------|--------------------------------|
| `layout:full`     | `{ windows: Window[], screen }` | Full window state snapshot     |
| `layout:diff`     | `{ added, removed, moved }`     | Delta update                   |
| `command:ack`     | `{ commandId, success }`        | Command execution result       |

### Server → Client

| Type              | Payload                          | Description                    |
|-------------------|----------------------------------|--------------------------------|
| `layout:full`     | `{ windows, screen }`           | Full state (on connect)        |
| `layout:diff`     | `{ added, removed, moved }`     | Delta update                   |
| `status`          | `{ daemonConnected, latency }`  | Connection health              |

### Client → Server → Daemon

| Type              | Payload                          | Description                    |
|-------------------|----------------------------------|--------------------------------|
| `command:focus`   | `{ windowId }`                  | Focus/raise a window           |
| `command:move`    | `{ windowId, x, y, w, h }`     | Move/resize a window           |
| `command:close`   | `{ windowId }`                  | Close a window                 |
| `command:space`   | `{ spaceNumber }`               | Switch virtual desktop         |

## Colour Mapping Strategy

Map apps to colours by bundle ID / process name:

```
Terminal / iTerm / Alacritty / Warp  → #00ff41 (matrix green)
VS Code / Cursor / Zed              → #007acc (vscode blue)
Browser (Chrome/Firefox/Arc)        → #4285f4 (google blue)
Finder / Files                      → #a2aaad (grey)
Slack                               → #4a154b (slack purple)
Figma                               → #f24e1e (figma orange)
Unknown                             → #6c757d (neutral grey)
```

Users can override via a `colours.json` config file.

## Code Standards

- **TypeScript** for server and client — strict mode, no `any`
- **Python** for daemon — type hints everywhere, ruff for linting
- **No classes unless genuinely needed** — prefer functions and plain objects
- **British English** in all user-facing text, comments, and docs
- **Error handling** — every WebSocket message handler wrapped in try/catch
- **Logging** — structured JSON logs, not console.log strings
- **No external cloud services** — everything runs locally

## Key Constraints

1. **Polling interval:** 300ms default, configurable. Must not spike CPU above 5%.
2. **Latency target:** < 100ms from window move to phone update.
3. **PWA must work offline** — shows last known layout with "disconnected" badge.
4. **macOS permissions:** Daemon needs Accessibility access. Must guide user through granting it.
5. **Tailscale assumed** — no auth layer needed, the network IS the auth.
6. **Phone-first design** — the PWA is optimised for mobile viewports. Desktop browser is a bonus.

## Agent Rules

Before starting any task:
1. Read `PRIMER.md` for current session state
2. Check `GITHUB.md` for what's been pushed
3. Follow the current sprint prompt from `SPRINTS.md`
4. After completing work, update `PRIMER.md` with what was done and what's next
5. Never leave a task half-done — if a feature needs tests, write the tests in the same session
