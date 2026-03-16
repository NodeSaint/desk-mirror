# Desk Mirror

**Your desktop layout, live on your phone.**

Desk Mirror streams your macOS window layout to a PWA on your phone in real time. Each window becomes a coloured, tappable block. Tap to focus. Drag to rearrange. Swipe to switch desktops. All over your local network — zero cloud, fully private.

---

## Why

Because `Alt+Tab` is for people who can see their screen. Desk Mirror is for when you're across the room, on the sofa, or just want a spatial overview of your workspace in your pocket.

---

## How It Works

```
Your Mac  →  Daemon reads window positions every 300ms
          →  Sends layout over WebSocket to local relay server
          →  Phone PWA connects and renders proportional blocks
          →  Tap/drag on phone sends commands back to Mac
```

Everything runs on your local network. If you use Tailscale, it works from anywhere on your mesh.

---

## Quick Start

```bash
# Clone
git clone https://github.com/[your-username]/desk-mirror.git
cd desk-mirror

# Run everything
chmod +x start.sh
./start.sh
```

The script will:
1. Check your Python and Node versions
2. Install dependencies
3. Start the daemon, server, and PWA dev server
4. Print a URL and QR code — scan it on your phone

> **macOS users:** You'll need to grant Accessibility permissions to your terminal. The script will guide you.

### Production Mode

```bash
./start-prod.sh
```

Builds the client and serves it statically from the relay server — 2 processes instead of 3. Open `http://[your-ip]:3847` on your phone.

---

## Requirements

- macOS 12+ (Linux support planned)
- Python 3.11+
- Node.js 20+
- A phone on the same network (or Tailscale)

---

## Configuration

Edit `config.json` in the project root:

```json
{
  "port": 3847,
  "pollInterval": 300,
  "colours": {
    "com.apple.Terminal": "#00ff41",
    "com.microsoft.VSCode": "#007acc",
    "com.google.Chrome": "#4285f4"
  },
  "filters": {
    "ignoreApps": ["Dock", "Spotlight", "Window Server"]
  }
}
```

Environment variables override config values:
- `DESK_MIRROR_PORT` — server port
- `DESK_MIRROR_POLL_INTERVAL` — polling interval in ms

---

## Troubleshooting

**"Accessibility access not granted"**
Go to System Settings > Privacy & Security > Accessibility. Add your terminal app (Terminal, iTerm, Warp, etc.).

**Phone can't connect**
Make sure your phone and Mac are on the same network. If using Tailscale, both devices need to be connected to your tailnet.

**High CPU usage**
Increase `pollInterval` in config.json. 500ms is a good balance. 1000ms is very light.

**Windows not appearing**
Some apps create invisible helper windows. These are filtered by default. Check `filters.ignoreApps` in config.json.

---

## Tech Stack

| Component | Tech |
|-----------|------|
| Desktop daemon | Python 3.11, pyobjc |
| Relay server | Node.js, Express, ws |
| Phone client | React, Vite, TypeScript |
| Networking | Tailscale (optional) |

---

## Project Structure

```
desk-mirror/
├── src/daemon/     ← Python — reads macOS windows
├── src/server/     ← Node.js — WebSocket relay
├── src/client/     ← React PWA — phone interface
├── docs/           ← Protocol spec
├── config.json     ← Shared configuration
├── start.sh        ← One-command launcher
└── CLAUDE.md       ← AI agent instructions
```

---

## Contributing

1. Fork and create a feature branch off `dev`
2. Follow the conventions in `CLAUDE.md`
3. Write tests for new functionality
4. Submit a PR to `dev`

---

## Licence

MIT — do whatever you want with it.
