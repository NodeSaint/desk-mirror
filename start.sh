#!/usr/bin/env bash
# Desk Mirror — development start script
# Starts all three components: daemon, relay server, and client dev server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# --- Colours ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[desk-mirror]${NC} $1"; }
ok()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
fail()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# --- Pre-flight checks ---

info "Running pre-flight checks..."

# Python 3.11+
PYTHON=""
for cmd in python3.11 python3.12 python3.13 python3; do
  if command -v "$cmd" &>/dev/null; then
    version=$("$cmd" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    major=$(echo "$version" | cut -d. -f1)
    minor=$(echo "$version" | cut -d. -f2)
    if [ "$major" -ge 3 ] && [ "$minor" -ge 11 ]; then
      PYTHON="$cmd"
      break
    fi
  fi
done
[ -z "$PYTHON" ] && fail "Python 3.11+ required. Found none."
ok "Python: $($PYTHON --version)"

# Node 20+
if ! command -v node &>/dev/null; then
  fail "Node.js 20+ required. Not found."
fi
NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
[ "$NODE_MAJOR" -lt 20 ] && fail "Node.js 20+ required. Found v$(node --version)."
ok "Node: $(node --version)"

# --- Install dependencies ---

info "Installing Python dependencies..."
$PYTHON -m pip install -q -r src/daemon/requirements.txt 2>&1 | grep -v "already satisfied" || true
ok "Python deps installed"

info "Installing server dependencies..."
(cd src/server && npm install --silent 2>&1) || fail "Server npm install failed"
ok "Server deps installed"

info "Installing client dependencies..."
(cd src/client && npm install --silent 2>&1) || fail "Client npm install failed"
ok "Client deps installed"

# --- Read config ---

PORT=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('config.json','utf8')).port)}catch{console.log(3847)}")

# --- Detect Tailscale IP ---

TAILSCALE_IP=""
if command -v tailscale &>/dev/null; then
  TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || true)
fi

if [ -z "$TAILSCALE_IP" ]; then
  # Try to find Tailscale IP from network interfaces
  TAILSCALE_IP=$(ifconfig 2>/dev/null | grep -A1 'utun' | grep 'inet 100\.' | awk '{print $2}' | head -1 || true)
fi

HOST_IP="${TAILSCALE_IP:-localhost}"

# --- Print connection info ---

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         ${GREEN}Desk Mirror${CYAN}                     ║${NC}"
echo -e "${CYAN}║  Your desktop layout, live on your phone ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
info "Relay server:  ws://${HOST_IP}:${PORT}"
info "Client dev:    http://${HOST_IP}:5173"
echo ""

if [ -n "$TAILSCALE_IP" ]; then
  CLIENT_URL="http://${TAILSCALE_IP}:5173"
  info "Phone URL: ${CLIENT_URL}"

  # Print QR code if qrencode is available
  if command -v qrencode &>/dev/null; then
    echo ""
    qrencode -t ANSIUTF8 "$CLIENT_URL"
    echo ""
  else
    warn "Install qrencode for a scannable QR code: brew install qrencode"
  fi
else
  warn "Tailscale IP not detected. Use localhost for local testing."
fi

echo ""
info "Starting all services... (Ctrl+C to stop)"
echo ""

# --- Start processes ---

cleanup() {
  echo ""
  info "Shutting down..."
  kill $SERVER_PID $CLIENT_PID $DAEMON_PID 2>/dev/null || true
  wait $SERVER_PID $CLIENT_PID $DAEMON_PID 2>/dev/null || true
  ok "All processes stopped."
}
trap cleanup EXIT INT TERM

# Start relay server
(cd src/server && npx tsx index.ts) &
SERVER_PID=$!
sleep 1

# Start client dev server
(cd src/client && npx vite --host 0.0.0.0) &
CLIENT_PID=$!
sleep 1

# Start daemon
(cd "$ROOT" && $PYTHON -m src.daemon.main) &
DAEMON_PID=$!

# Wait for any process to exit
wait -n $SERVER_PID $CLIENT_PID $DAEMON_PID 2>/dev/null || true
