# DESK MIRROR — PRIMER.md

> **PURPOSE:** This file is the memory between sessions. Read it FIRST when you start. Update it LAST before you stop. Every session must leave this file accurate.

---

## Current State

| Field               | Value                        |
|---------------------|------------------------------|
| **Current Sprint**  | Post-Sprint 4 (v0.3.1)      |
| **Last Session**    | Session 5                    |
| **Last Updated**    | 2026-03-17                   |
| **Blocker**         | None                         |
| **Next Action**     | Sprint 5 stretch goals       |

---

## What Has Been Built

- **Desktop Daemon** (`src/daemon/`) — Python daemon that reads macOS window positions via CGWindowListCopyWindowInfo, diffs layout changes, streams via WebSocket to relay server. Supports commands (focus, move, close, space switch). Falls back to stdout with `--stdout` flag.
- **Relay Server** (`src/server/`) — Node.js Express + WebSocket server that receives layout from daemon, stores state, broadcasts to phone clients, routes commands back to daemon. Status broadcasts every 5s. Health endpoint at `/health`.
- **Phone PWA** (`src/client/`) — React 18 + Vite + TypeScript PWA. Renders desktop windows as proportional coloured blocks. Tap to focus, long press for context menu (focus/close), drag to move. Swipe left/right to switch spaces. Status bar with connection dot + latency. Settings screen for server URL. Service worker for offline caching. Dark theme (#0a0a0a), mobile-first, hand-rolled UI (no component libs).
- **Setup Scripts** — `start.sh` (dev: 3 processes) and `start-prod.sh` (prod: build + 2 processes with static serving). Pre-flight checks, dependency install, Tailscale IP detection, QR code output.

---

## What Works

- `python -m src.daemon.main` — connects to relay server, streams layout updates (9 differ tests passing)
- `python -m src.daemon.main --stdout` — stdout mode for debugging
- `npx tsx index.ts` (in src/server/) — relay server on port 3847 (21 tests passing)
- End-to-end: daemon → server → client WebSocket pipeline verified working
- Daemon auto-reconnects with exponential backoff (1s→2s→4s→...→30s max)
- Server stores layout state, new clients get immediate `layout:full` on connect
- Commands: focus, move, close, space switch — routed from client → server → daemon → ack
- Colour mapping from config.json works (VSCode → blue, Terminal → green, etc.)
- System UI filtered out (Dock, Spotlight, etc.)
- Graceful warning if Accessibility permissions not granted (continues with degraded mode)
- Daemon disconnect notifies all clients via status message
- `npm run dev` (in src/client/) — Vite dev server on port 5173 (20 tests passing)
- `npm run build` — production build successful (154kB gzipped to 50kB)
- PWA: manifest.json, service worker, installable, offline-capable
- Layout scaling: desktop coordinates correctly mapped to phone viewport (aspect ratio preserved)
- Touch: tap to focus (with haptic), long press for context menu, drag to move, swipe to switch spaces
- Settings screen with server URL input, persists to localStorage
- TypeScript strict mode, no `any`, clean compile
- `./start.sh` — one-command dev launcher (daemon + server + client dev)
- `./start-prod.sh` — production mode (builds client, serves static from relay server)
- Production static serving via DESK_MIRROR_SERVE_STATIC env var
- Window appear animation (fade in, 150ms)
- .gitignore covers node_modules, __pycache__, .env, dist, IDE files
- README.md with quick start, config reference, troubleshooting, contributing

---

## What's Broken

_N/A_

---

## Decisions Made

| # | Decision | Reasoning | Date |
|---|----------|-----------|------|
| 1 | Python for daemon, Node for relay, React for PWA | Python has the best macOS accessibility bindings (pyobjc). Node is fastest for WebSocket relay. React/Vite for PWA with touch. | Project kickoff |
| 2 | Tailscale-only networking | Already running on all devices. Network IS the auth layer. Zero config. | Project kickoff |
| 3 | Delta updates over WebSocket | Full layout every 300ms wastes bandwidth. Send diffs only after initial full sync. | Project kickoff |
| 4 | No classes unless necessary | Functional style preferred. Plain objects + functions. | Project kickoff |
| 5 | British English throughout | User preference. All UI text, comments, logs. | Project kickoff |
| 6 | Accessibility check is non-fatal | CGWindowList works without Accessibility; only AX focus detection needs it. Daemon warns and continues in degraded mode. | Sprint 1 |
| 7 | AXUIElement functions live in HIServices, not Quartz | pyobjc splits macOS frameworks; AX accessibility functions are in HIServices module. | Sprint 1 |

---

## File Inventory

> Update this as files are created. Agent must check this matches reality.

```
desk-mirror/
├── CLAUDE.md           ✅ Complete
├── PRIMER.md           ✅ Complete (this file)
├── GITHUB.md           ✅ Complete
├── SPRINTS.md          ✅ Complete
├── AGENTS.md           ✅ Complete
├── README.md           ✅ Updated (Sprint 4)
├── .gitignore          ✅ Sprint 4
├── config.json         ✅ Complete
├── start.sh            ✅ Sprint 4 (dev launcher)
├── start-prod.sh       ✅ Sprint 4 (prod launcher)
├── docs/
│   └── PROTOCOL.md     ✅ Complete
├── src/
│   ├── daemon/         ✅ Sprint 2 complete
│   │   ├── __init__.py
│   │   ├── main.py          (WebSocket + stdout modes)
│   │   ├── models.py
│   │   ├── differ.py
│   │   ├── config.py
│   │   ├── commands.py      (focus, move, close, space switch)
│   │   ├── requirements.txt (+ websockets)
│   │   ├── platforms/
│   │   │   ├── __init__.py
│   │   │   └── macos.py
│   │   └── tests/
│   │       ├── __init__.py
│   │       └── test_differ.py
│   ├── server/         ✅ Sprint 4 complete
│   │   ├── index.ts         (Express + WS server + static serving)
│   │   ├── types.ts         (protocol types)
│   │   ├── state.ts         (in-memory layout state)
│   │   ├── rooms.ts         (connection management)
│   │   ├── logger.ts        (structured JSON logger)
│   │   ├── config.ts        (port, intervals)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tests/
│   │       ├── state.test.ts
│   │       └── rooms.test.ts
│   └── client/         ✅ Sprint 3 complete
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── vite.config.ts
│       ├── public/
│       │   ├── manifest.json
│       │   └── sw.js
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── vite-env.d.ts
│           ├── styles/global.css
│           ├── lib/
│           │   ├── protocol.ts
│           │   └── colours.ts
│           ├── hooks/
│           │   ├── useWebSocket.ts
│           │   ├── useLayout.ts
│           │   └── useDrag.ts
│           ├── components/
│           │   ├── DesktopCanvas.tsx
│           │   ├── WindowBlock.tsx
│           │   ├── SpaceSwitcher.tsx
│           │   ├── StatusBar.tsx
│           │   └── Settings.tsx
│           └── __tests__/
│               ├── useLayout.test.ts
│               └── colours.test.ts
```

---

## Environment Notes

- **Host machine:** macOS (primary target)
- **Phone:** iPhone (PWA via Safari)
- **Network:** Tailscale mesh
- **Node version:** 20+
- **Python version:** 3.11+

---

## Session Log

> Append a new entry at the top each session. Never delete old entries.

### Session 5 — Post-launch fixes + features
- **Date:** 2026-03-17
- **What happened:** First live test on real iPhone over Tailscale. Fixed EADDRINUSE crash by killing stale processes. Fixed start.sh using `wait -n` (not supported in zsh) — replaced with plain `wait`. Fixed latency display growing unboundedly — now shows interval between daemon messages. Added window z-index tracking (v0.2.0) so phone mirrors actual stacking order from CGWindowList front-to-back ordering. Fixed drag-to-move: AXValueCreate was in HIServices not Quartz, used CGPoint/CGSize with proper constants (v0.3.1). Rewrote useDrag.ts to properly map touch deltas to desktop coordinates with screen boundary clamping. Wrote beginner-friendly README with step-by-step setup, Tailscale guide, and troubleshooting. All 50 tests passing. Pushed v0.1.0, v0.1.1, v0.2.0, v0.3.0, v0.3.1.
- **What's next:** Sprint 5 stretch goals (Linux support, thumbnails, multi-monitor, etc.)
- **Blockers:** None.

### Session 4 — Sprint 4: Integration, Polish & v0.1.0
- **Date:** 2026-03-16
- **What happened:** Created start.sh (dev launcher: pre-flight checks, dep install, Tailscale IP detection, QR code, starts all 3 processes with signal handling) and start-prod.sh (builds client, serves static from relay server, 2 processes). Added static file serving to relay server via DESK_MIRROR_SERVE_STATIC env var with SPA fallback. Added .gitignore. Updated README.md with production mode section and contributing guidelines. Added window appear animation (block-appear keyframe, 150ms). Verified prod static serving (HTTP 200). All 50 tests still passing (9 daemon + 21 server + 20 client). All Sprint 4 polish items were already implemented in earlier sprints (haptic, reconnection, first-time setup overlay).
- **What's next:** Git init, commit, tag v0.1.0. Then Sprint 5 stretch goals.
- **Blockers:** None.

### Session 3 — Sprint 3: Phone PWA
- **Date:** 2026-03-16
- **What happened:** Built the full React PWA client. Created protocol.ts (message types + commandId generator), colours.ts (bundle→colour mapping + lighten helper), useWebSocket.ts (connection management with auto-reconnect + diff application), useLayout.ts (desktop→viewport coordinate scaling), useDrag.ts (touch drag with threshold + long press detection). Components: DesktopCanvas (main renderer), WindowBlock (coloured block with initial + title), StatusBar (connection dot + latency), SpaceSwitcher (horizontal swipe detection), Settings (server URL config with localStorage). PWA: manifest.json, service worker (network-first with cache fallback), dark theme, mobile-first. TypeScript strict, no any, clean compile. Vite build: 154kB → 50kB gzipped. All 20 client tests passing (7 layout + 13 colours).
- **What's next:** Begin Sprint 4 — integration, polish, and v0.1.0 release.
- **Blockers:** None.

### Session 2 — Sprint 2: Relay Server + Daemon WebSocket
- **Date:** 2026-03-16
- **What happened:** Built the full relay server (Express + ws on port 3847). Created types.ts (protocol types), state.ts (in-memory layout with applyFull/applyDiff), rooms.ts (daemon slot + client pool + command tracking), logger.ts (structured JSON), config.ts (reads config.json). Server routes layout from daemon to clients, commands from clients to daemon, acks back to originating client. Status broadcasts every 5s. Health endpoint at /health. Updated daemon main.py with async WebSocket mode (auto-reconnect with exponential backoff) + command listener. Created commands.py (focus via AXRaise, move via AXPosition/AXSize, close via AXCloseButton, space switch via CGEventCreateKeyboardEvent). Added --stdout flag for Sprint 1 compat. All 30 tests passing (9 daemon + 21 server). Full E2E verified: daemon connects, sends layout:full, client receives it.
- **What's next:** Begin Sprint 3 — build the phone PWA.
- **Blockers:** None.

### Session 1 — Sprint 1: Desktop Daemon
- **Date:** 2026-03-16
- **What happened:** Built the full desktop daemon. Created models.py (Window, Screen, MovedWindow, LayoutDiff dataclasses), config.py (reads config.json, env vars), differ.py (layout diffing with 5px threshold), platforms/macos.py (CGWindowList + AXUIElement APIs), main.py (poll loop outputting JSON). Discovered AX functions live in HIServices, not Quartz. Made accessibility check non-fatal — daemon warns and continues with degraded active-window detection. All 9 differ tests passing. Daemon successfully detects 8-9 windows with correct positions, bundle IDs, and colour mapping.
- **What's next:** Begin Sprint 2 — build the relay server and add WebSocket to daemon.
- **Blockers:** None.

### Session 0 — Project Scaffold
- **Date:** [TO BE FILLED ON FIRST RUN]
- **What happened:** Project documentation and scaffold created outside Claude Code. All .md files written. No code yet.
- **What's next:** Begin Sprint 1 — build the desktop daemon.
- **Blockers:** None.

---

## How To Update This File

When finishing a session, update:
1. **Current State table** — bump sprint, set last session date, note blockers
2. **What Has Been Built** — add new components
3. **What Works** — only things that are tested and confirmed running
4. **What's Broken** — anything that needs fixing
5. **File Inventory** — mark new files ✅, update structure if changed
6. **Session Log** — add new entry at the TOP with date, summary, next steps, blockers
