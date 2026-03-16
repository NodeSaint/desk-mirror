#!/usr/bin/env bash
# Desk Mirror — production start script
# Builds the client, serves it statically from the relay server,
# and runs daemon + server only (2 processes).
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
[ -z "$PYTHON" ] && fail "Python 3.11+ required."
if ! command -v node &>/dev/null; then fail "Node.js 20+ required."; fi

# --- Install & build ---

info "Installing dependencies..."
$PYTHON -m pip install -q -r src/daemon/requirements.txt 2>&1 | grep -v "already satisfied" || true
(cd src/server && npm install --silent 2>&1)
(cd src/client && npm install --silent 2>&1)
ok "Dependencies installed"

info "Building client for production..."
(cd src/client && npx vite build)
ok "Client built"

# --- Read config ---

PORT=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('config.json','utf8')).port)}catch{console.log(3847)}")

# --- Detect Tailscale IP ---

TAILSCALE_IP=""
if command -v tailscale &>/dev/null; then
  TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || true)
fi
if [ -z "$TAILSCALE_IP" ]; then
  TAILSCALE_IP=$(ifconfig 2>/dev/null | grep -A1 'utun' | grep 'inet 100\.' | awk '{print $2}' | head -1 || true)
fi
HOST_IP="${TAILSCALE_IP:-localhost}"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         ${GREEN}Desk Mirror${CYAN}  (production)       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
info "Server: http://${HOST_IP}:${PORT}"
info "Open on your phone to connect."
echo ""

if [ -n "$TAILSCALE_IP" ] && command -v qrencode &>/dev/null; then
  qrencode -t ANSIUTF8 "http://${TAILSCALE_IP}:${PORT}"
  echo ""
fi

info "Starting... (Ctrl+C to stop)"
echo ""

# --- Start ---

cleanup() {
  echo ""
  info "Shutting down..."
  kill $SERVER_PID $DAEMON_PID 2>/dev/null || true
  wait $SERVER_PID $DAEMON_PID 2>/dev/null || true
  ok "Stopped."
}
trap cleanup EXIT INT TERM

# Start relay server (with static file serving)
DESK_MIRROR_SERVE_STATIC="$ROOT/src/client/dist" \
  npx tsx src/server/index.ts &
SERVER_PID=$!
sleep 1

# Start daemon
(cd "$ROOT" && $PYTHON -m src.daemon.main) &
DAEMON_PID=$!

wait -n $SERVER_PID $DAEMON_PID 2>/dev/null || true
