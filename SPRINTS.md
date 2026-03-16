# DESK MIRROR — SPRINTS.md

> **PURPOSE:** Sequential sprint prompts to feed into Claude Code. Each sprint builds on the last. Copy-paste the prompt for the current sprint into Claude Code. Do not skip sprints.

---

## How To Use

1. Check `PRIMER.md` to see which sprint you're on
2. Find that sprint below
3. Copy the entire prompt block (inside the code fence) into Claude Code
4. Let the agent work. It will read `CLAUDE.md`, `PRIMER.md`, and `GITHUB.md` as instructed.
5. After the sprint, verify the **Acceptance Criteria** at the bottom of each sprint.
6. If all criteria pass, move to the next sprint. If not, re-run with corrections.

---

## Sprint 1 — The Daemon (Desktop Window Reader)

**Goal:** Build a Python daemon that reads all visible window positions on macOS and outputs them as structured JSON.

```
Read CLAUDE.md, PRIMER.md, and GITHUB.md before starting.

You are building the Desktop Daemon for Desk Mirror — a tool that reads macOS window positions and streams them to a phone.

TASK: Build src/daemon/ — a Python daemon that:

1. Uses pyobjc and the macOS Accessibility API (CGWindowListCopyWindowInfo) to get all on-screen windows
2. For each window, extracts: window ID, owner app name, bundle ID, window title, x, y, width, height, which Space/desktop it's on, whether it's the active window, whether it's minimised
3. Maps each window into the JSON schema defined in CLAUDE.md under "Data Model"
4. Runs a polling loop at 300ms intervals
5. Implements a differ (src/daemon/differ.py) that compares current state to previous state and produces a delta: { added: [], removed: [], moved: [] }. A window counts as "moved" if x, y, width, or height changed by more than 5px.
6. Outputs the full layout on first run, then only diffs after that
7. For now, just prints the JSON to stdout (WebSocket comes in Sprint 2)
8. Handles permissions gracefully — if Accessibility access isn't granted, print a clear message explaining how to enable it in System Preferences > Privacy & Security > Accessibility
9. Filters out windows that are: off-screen, zero-size, or belonging to system UI elements (like the menu bar, Dock, Spotlight)
10. Includes a screen info object: { width, height, scaleFactor } from the main display

Files to create:
- src/daemon/main.py (entry point, polling loop)
- src/daemon/platforms/macos.py (macOS-specific window reading)
- src/daemon/differ.py (state diffing logic)
- src/daemon/models.py (dataclasses for Window, Screen, Layout)
- src/daemon/config.py (polling interval, filter rules, configurable)
- src/daemon/requirements.txt (pyobjc-core, pyobjc-framework-Cocoa, pyobjc-framework-Quartz)

Testing:
- Create src/daemon/tests/test_differ.py with at least 5 test cases: no change, window added, window removed, window moved, multiple changes at once
- All tests must pass before you commit

Use type hints everywhere. British English in all comments and docstrings. No classes unless a dataclass makes genuine sense.

After completing:
- Commit to feat/daemon-polling on dev
- Update PRIMER.md
- Update GITHUB.md push log
```

### Acceptance Criteria — Sprint 1
- [ ] `python src/daemon/main.py` runs and prints window JSON to stdout
- [ ] Output matches the data model in CLAUDE.md
- [ ] Differ correctly identifies added/removed/moved windows
- [ ] Filtered: no menu bar, Dock, Spotlight, zero-size, or off-screen windows
- [ ] Graceful error if Accessibility permissions not granted
- [ ] All tests pass
- [ ] PRIMER.md and GITHUB.md updated

---

## Sprint 2 — The Relay Server (WebSocket Hub)

**Goal:** Build a Node.js WebSocket server that receives layout data from the daemon and broadcasts it to phone clients. Also relays commands back.

```
Read CLAUDE.md, PRIMER.md, and GITHUB.md before starting.

TASK: Build src/server/ — a Node.js WebSocket relay server that:

1. Runs an Express HTTP server on a configurable port (default 3847)
2. Runs a WebSocket server (using the 'ws' library) on the same port
3. Accepts TWO types of WebSocket connections, distinguished by URL path:
   - /daemon — the desktop daemon connects here (only 1 allowed at a time)
   - /client — phone clients connect here (multiple allowed)
4. When the daemon sends a 'layout:full' message, store it as current state and broadcast to all clients
5. When the daemon sends a 'layout:diff' message, apply the diff to stored state and broadcast to all clients
6. When a client sends a 'command:focus', 'command:move', 'command:close', or 'command:space' message, forward it to the daemon connection
7. When the daemon sends a 'command:ack', forward it to the client that issued the command
8. Send a 'status' message to all clients every 5 seconds with: { daemonConnected: boolean, clientCount: number, latency: number }
9. When a new client connects, immediately send the current stored layout as 'layout:full'
10. Handle disconnection gracefully — if daemon disconnects, notify all clients. If a client disconnects, clean up.
11. Add request logging — every message type received/sent, with timestamps

Files to create:
- src/server/index.ts (Express + WebSocket server entry point)
- src/server/types.ts (TypeScript types matching the protocol in CLAUDE.md)
- src/server/state.ts (in-memory layout state management)
- src/server/rooms.ts (connection management — daemon slot + client pool)
- src/server/logger.ts (structured JSON logger)
- src/server/config.ts (port, intervals, configurable via env vars)
- src/server/package.json (ws, express, typescript, tsx, vitest as dev dep)
- src/server/tsconfig.json

ALSO: Update the daemon (src/daemon/main.py) to:
- Connect to the relay server via WebSocket (use websockets library) instead of printing to stdout
- Send layout:full on connect, then layout:diff on each poll cycle
- Listen for inbound command messages and execute them via a new src/daemon/commands.py:
  - command:focus → bring window to front (use Accessibility API)
  - command:move → set window position and size
  - command:close → close the window
  - command:space → switch to Space N (this is hard on macOS — use a keyboard shortcut simulation via CGEventCreateKeyboardEvent as a workaround, Ctrl+N)
- Send command:ack back after executing each command

Testing:
- src/server/tests/state.test.ts — test layout storage and diff application
- src/server/tests/rooms.test.ts — test connection management (mock WebSockets)
- All existing daemon tests must still pass

Strict TypeScript. No 'any'. British English. Functional style.

After completing:
- Commit to feat/relay-server on dev
- Update PRIMER.md
- Update GITHUB.md push log
```

### Acceptance Criteria — Sprint 2
- [ ] Server starts on port 3847
- [ ] Daemon connects and streams layout data
- [ ] Connecting a second WebSocket to /client receives current layout
- [ ] Commands sent from /client are forwarded to daemon
- [ ] Status messages broadcast every 5 seconds
- [ ] Graceful handling of daemon disconnect/reconnect
- [ ] All tests pass (server + daemon)
- [ ] PRIMER.md and GITHUB.md updated

---

## Sprint 3 — The Phone Client (PWA)

**Goal:** Build a React PWA that renders the desktop layout as interactive coloured blocks on your phone.

```
Read CLAUDE.md, PRIMER.md, and GITHUB.md before starting.

TASK: Build src/client/ — a React + Vite + TypeScript PWA that:

1. Connects to the relay server WebSocket at /client
2. Renders a canvas-like view where each window is a proportional coloured rectangle
3. The layout is scaled to fit the phone viewport while preserving aspect ratio of the desktop
4. Each block shows:
   - App icon or first letter of app name (large, centered)
   - Window title (small text, truncated, at bottom of block)
   - Coloured background based on the colour mapping in CLAUDE.md
   - Subtle border, slight drop shadow for depth
   - Active window has a bright accent border (use a pulsing glow animation)
5. Touch interactions:
   - TAP a block → sends command:focus to server
   - LONG PRESS a block → shows options: Focus, Close, (future: minimise)
   - DRAG a block → sends command:move with new position mapped back to desktop coordinates
   - SWIPE LEFT/RIGHT on empty space → sends command:space to switch virtual desktops
6. Connection status bar at top: green dot = connected, red dot = disconnected, shows latency
7. Landscape and portrait support — layout adjusts automatically
8. PWA setup:
   - manifest.json with app name "Desk Mirror", theme colour #0a0a0a, dark background
   - Service worker that caches the app shell for offline launch
   - When offline, shows last known layout with a "Disconnected" overlay
9. Config screen (accessible via gear icon):
   - Server URL input (default: ws://[tailscale-ip]:3847/client)
   - Saves to localStorage
   - Shows QR code of the URL for easy sharing (use qrcode library or inline SVG generation)
10. Design:
    - Dark background (#0a0a0a)
    - Blocks have rounded corners (8px)
    - Smooth animations on layout changes (use CSS transitions, 200ms ease-out)
    - Font: system default (-apple-system)
    - Minimalist. No chrome. The blocks ARE the interface.

Files to create:
- Standard Vite + React + TypeScript scaffold
- All components listed in CLAUDE.md directory structure
- src/client/public/manifest.json
- src/client/public/sw.js (or use vite-plugin-pwa)

Testing:
- src/client/src/__tests__/useLayout.test.ts — test coordinate scaling (desktop coords → phone viewport)
- src/client/src/__tests__/colours.test.ts — test app-to-colour mapping with known + unknown apps

Strict TypeScript. Tailwind for utility styling. No component libraries — hand-rolled UI. British English. Mobile-first. Must score 90+ on Lighthouse PWA audit.

After completing:
- Commit to feat/phone-client on dev
- Update PRIMER.md
- Update GITHUB.md push log
```

### Acceptance Criteria — Sprint 3
- [ ] `npm run dev` in src/client/ opens the PWA
- [ ] Connecting to a running server shows window layout as coloured blocks
- [ ] Tapping a block focuses the corresponding window on desktop
- [ ] Dragging a block moves the window on desktop
- [ ] Swiping switches virtual desktops
- [ ] Connection status indicator works
- [ ] PWA is installable on iOS Safari
- [ ] Offline mode shows last known layout
- [ ] All tests pass
- [ ] PRIMER.md and GITHUB.md updated

---

## Sprint 4 — Integration, Polish & First Release

**Goal:** Wire everything together end-to-end. Fix bugs. Polish UX. Tag v0.1.0.

```
Read CLAUDE.md, PRIMER.md, and GITHUB.md before starting.

TASK: Integration sprint. Make the full loop work flawlessly.

1. END-TO-END TEST:
   - Start daemon, start server, open PWA on phone (or phone simulator)
   - Verify: windows appear, moving a window on desktop updates the phone within 500ms, tapping a block focuses the window, dragging a block moves the window

2. SETUP SCRIPT:
   - Create a root-level start.sh that:
     a. Checks Python version >= 3.11
     b. Checks Node version >= 20
     c. Checks Accessibility permissions (on macOS)
     d. Installs Python deps (pip install -r src/daemon/requirements.txt)
     e. Installs Node deps (npm install in src/server and src/client)
     f. Starts all three processes (daemon, server, client dev server) with proper signal handling
     g. Prints the Tailscale URL + QR code to terminal for the phone to scan
   - Also create a start-prod.sh that builds the client, serves it statically from the relay server, and runs daemon + server only (2 processes instead of 3)

3. CONFIGURATION:
   - Create a root config.json:
     { "port": 3847, "pollInterval": 300, "colours": { ... }, "filters": { "ignoreApps": ["Dock", "Spotlight"] } }
   - All three components read from this single config file
   - Environment variables override config.json values

4. POLISH:
   - Add haptic feedback on tap (navigator.vibrate) on the PWA
   - Smooth reconnection — if WebSocket drops, auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)
   - Window appear/disappear animations on the phone (fade in/out, 150ms)
   - Show a "first-time setup" overlay on the PWA if server URL isn't configured

5. DOCUMENTATION:
   - Write a proper README.md with:
     - What it is (with screenshot/gif placeholder)
     - Why it exists
     - Quick start (< 5 steps)
     - Configuration reference
     - Troubleshooting (common issues: permissions, Tailscale not connected, port conflicts)
     - Contributing guidelines
   - Update docs/PROTOCOL.md if any message formats changed

6. RELEASE:
   - Merge feat branches into dev
   - Merge dev into main
   - Tag v0.1.0
   - Update PRIMER.md to reflect release state
   - Update GITHUB.md with final push log entry

After completing:
- Final commit to dev, then merge to main
- Tag v0.1.0
- Update PRIMER.md
- Update GITHUB.md push log
```

### Acceptance Criteria — Sprint 4
- [ ] start.sh runs all three components with one command
- [ ] Full loop works: daemon → server → phone, and phone → server → daemon
- [ ] Latency under 500ms for layout updates
- [ ] Auto-reconnect works when server is restarted
- [ ] Config.json is respected by all components
- [ ] README.md is complete and accurate
- [ ] v0.1.0 tagged on main
- [ ] PRIMER.md and GITHUB.md reflect final state

---

## Sprint 5 — Stretch Goals (Post-MVP)

**Goal:** Nice-to-haves for after v0.1.0 is stable.

```
Read CLAUDE.md, PRIMER.md, and GITHUB.md before starting.

Pick from the following stretch goals based on what feels most valuable:

A. LINUX SUPPORT
   - Implement src/daemon/platforms/linux.py using wmctrl and xdotool
   - Detect platform at startup and load the right module
   - Test on Ubuntu 24

B. WINDOW THUMBNAILS
   - Capture a low-res screenshot of each window (macOS: CGWindowListCreateImage)
   - Compress to tiny JPEG (50px wide, quality 30)
   - Send as base64 in the window object
   - Render as background of each block on the phone
   - Update thumbnails every 2 seconds (not every poll cycle — too heavy)

C. AUDIO FEEDBACK
   - Play a subtle click sound on the phone when a window is focused
   - Play a whoosh on space switch
   - Use Web Audio API, no external audio files

D. MULTI-MONITOR SUPPORT
   - Detect all connected displays
   - Send display info in screen object
   - Phone shows tabs or a scrollable view for each monitor
   - Window positions are relative to their display

E. KEYBOARD SHORTCUT PASSTHROUGH
   - Phone shows a small keyboard icon
   - Tapping it reveals common shortcuts (Cmd+Tab, Cmd+W, Cmd+Space)
   - Tapping a shortcut sends it to the daemon for execution
   - Customisable shortcut list in config.json

For each goal you implement:
- Create a feature branch (feat/[goal-name])
- Write tests
- Update PRIMER.md and GITHUB.md
- Merge to dev when complete
```

---

## Sprint Prompt Template (For Future Sprints)

```
Read CLAUDE.md, PRIMER.md, and GITHUB.md before starting.

TASK: [Clear description of what to build]

1. [Step 1]
2. [Step 2]
...

Files to create/modify:
- [file list]

Testing:
- [test requirements]

After completing:
- Commit to [branch] on dev
- Update PRIMER.md
- Update GITHUB.md push log
```
