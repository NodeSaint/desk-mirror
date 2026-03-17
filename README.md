# Desk Mirror

**Your desktop layout, live on your phone.**

Desk Mirror streams your macOS window layout to your phone in real time. Each window becomes a coloured, tappable block. Tap to focus a window. Drag to move it. Long press to close it. Everything runs on your local network — zero cloud, fully private.

---

## What You Need

Before you start, make sure you have these installed on your Mac:

- **Python 3.11 or newer** — check with `python3 --version`
- **Node.js 20 or newer** — check with `node --version`
- **Tailscale** (recommended) — for connecting your phone from anywhere on your network

If you don't have Python 3.11+, install it with [Homebrew](https://brew.sh):
```bash
brew install python@3.11
```

If you don't have Node.js 20+:
```bash
brew install node
```

---

## Step-by-Step Setup

### 1. Clone the repo

Open Terminal on your Mac and run:

```bash
git clone https://github.com/NodeSaint/desk-mirror.git
cd desk-mirror
```

### 2. Grant Accessibility permissions

Desk Mirror needs permission to read and move your windows. macOS will prompt you when you first run it, but you can set it up ahead of time:

1. Open **System Settings**
2. Go to **Privacy & Security > Accessibility**
3. Click the **+** button
4. Add your terminal app (e.g. **Terminal**, **iTerm**, **Warp**, or **VS Code**)
5. Make sure the toggle is **on**

> Without this, Desk Mirror can still show your windows, but it won't be able to focus or move them when you tap/drag on your phone.

### 3. Start Desk Mirror

```bash
./start.sh
```

That's it. The script will:
- Check your Python and Node versions
- Install all dependencies automatically
- Start all three services (daemon, server, and phone app)
- Print your connection URL

You'll see output like this:
```
╔══════════════════════════════════════════╗
║         Desk Mirror                     ║
║  Your desktop layout, live on your phone ║
╚══════════════════════════════════════════╝

[desk-mirror] Relay server:  ws://100.88.70.112:3847
[desk-mirror] Client dev:    http://100.88.70.112:5173

[desk-mirror] Phone URL: http://100.88.70.112:5173
```

Keep this terminal window open — closing it stops Desk Mirror.

### 4. Connect your phone

1. Open **Safari** on your iPhone (Chrome works too, but Safari is best for PWA)
2. Go to the **Phone URL** shown in your terminal (e.g. `http://100.88.70.112:5173`)
3. You'll see a **Settings screen** — enter the WebSocket URL:
   ```
   ws://100.88.70.112:3847/client
   ```
   (Replace the IP with whatever your terminal showed)
4. Tap **Connect**
5. Your desktop windows appear as coloured blocks!

### 5. Install as an app (optional)

To make it feel like a real app on your phone:

1. In Safari, tap the **Share** button (the square with an arrow)
2. Scroll down and tap **Add to Home Screen**
3. Tap **Add**

Now you have a "Desk Mirror" icon on your home screen that opens without browser chrome.

---

## Using Tailscale

[Tailscale](https://tailscale.com) is a free VPN that creates a private network between your devices. It's the recommended way to use Desk Mirror because:

- **It just works** — no port forwarding, no router config
- **Works from anywhere** — your phone connects to your Mac even on different Wi-Fi networks
- **Secure** — everything is encrypted, only your devices can see each other

### Setting up Tailscale

1. **Install Tailscale on your Mac:** Download from [tailscale.com](https://tailscale.com/download) or `brew install tailscale`
2. **Install Tailscale on your iPhone:** Download from the App Store
3. **Sign in** on both devices with the same account
4. **That's it** — both devices now have a Tailscale IP (starts with `100.`)

When you run `./start.sh`, it automatically detects your Tailscale IP and uses it. The URL it prints will use your Tailscale IP, so your phone can connect from anywhere.

### Without Tailscale

If you don't use Tailscale, your Mac and phone just need to be on the **same Wi-Fi network**. The script will use your local IP (e.g. `192.168.1.x`) instead.

---

## What You Can Do

| Action | How |
|--------|-----|
| **Focus a window** | Tap its block on your phone |
| **Move a window** | Drag its block to a new position |
| **Close a window** | Long press its block, then tap "Close" |
| **Switch desktops** | Swipe left/right on empty space |
| **Open settings** | Tap the gear icon (top right) |

The status bar at the top shows:
- **Green dot** = connected and working
- **Orange dot** = connected to server, waiting for daemon
- **Red dot** = disconnected
- **Latency number** = how fresh the data is (lower = better)

---

## Configuration

You can customise Desk Mirror by editing `config.json` in the project root:

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

- **port** — which port the server runs on (default: 3847)
- **pollInterval** — how often to check window positions, in milliseconds (default: 300). Higher = less CPU usage
- **colours** — map app bundle IDs to hex colours. Find an app's bundle ID with: `osascript -e 'id of app "AppName"'`
- **filters.ignoreApps** — apps to hide from the mirror

---

## Production Mode

For a cleaner setup (no Vite dev server), use:

```bash
./start-prod.sh
```

This builds the phone app and serves it directly from the relay server on port 3847. Only two processes instead of three. Open `http://[your-ip]:3847` on your phone.

---

## Troubleshooting

**"Accessibility access not granted"**
Go to System Settings > Privacy & Security > Accessibility. Add your terminal app and make sure the toggle is on. Then restart `./start.sh`.

**Phone shows "Disconnected" or "Connecting..."**
- Check that `./start.sh` is still running in your terminal
- Make sure the WebSocket URL in settings matches what the terminal printed
- If using Tailscale, check both devices are connected (Tailscale icon in menu bar should be active)

**Windows don't move when I drag**
You need Accessibility permissions. See step 2 above.

**Port already in use**
Another process is using port 3847 or 5173. Kill it with:
```bash
lsof -ti :3847 | xargs kill
lsof -ti :5173 | xargs kill
```
Then run `./start.sh` again.

**High CPU usage**
Increase `pollInterval` in config.json. Try 500 (half-second updates) or 1000 (one-second updates).

---

## Tech Stack

| Component | Tech |
|-----------|------|
| Desktop daemon | Python 3.11, pyobjc |
| Relay server | Node.js, Express, ws |
| Phone client | React 18, Vite, TypeScript |
| Networking | Tailscale (recommended) or any local network |

---

## Licence

MIT
