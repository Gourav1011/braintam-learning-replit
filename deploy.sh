#!/usr/bin/env bash
# =============================================================================
# Braintam VPS Deployment Script
# =============================================================================
# Architecture: Single Express process on PORT=5000
#   Browser → Nginx → localhost:5000 (API + React SPA + Socket.IO + Neon DB)
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh              # standard deploy (uses committed dist)
#   ./deploy.sh --rebuild    # force rebuild on this machine before restart
# =============================================================================

set -euo pipefail

REBUILD=false
if [[ "${1:-}" == "--rebuild" ]]; then
  REBUILD=true
fi

APP_NAME="braintam-api"
PORT=5000
ENTRY="artifacts/api-server/dist/index.mjs"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Braintam Deploy  —  $(date '+%Y-%m-%d %H:%M:%S')"
echo "══════════════════════════════════════════════════════════"

# ── 1. Pull latest code (includes pre-built dist/) ────────────
echo ""
echo "[1/5] Pulling latest code from GitHub..."
git pull origin main

# ── 2. Optional rebuild ───────────────────────────────────────
if [[ "$REBUILD" == true ]]; then
  echo ""
  echo "[2/5] Rebuilding (--rebuild flag set)..."

  if ! command -v pnpm &>/dev/null; then
    echo "ERROR: pnpm not found. Install with: npm install -g pnpm"
    exit 1
  fi

  # Bypass the preinstall user-agent check that fails on some VPS environments
  export npm_config_user_agent="pnpm/10.0.0 npm/? node/$(node --version) linux x64"

  echo "      Installing dependencies..."
  pnpm install --frozen-lockfile --ignore-scripts

  echo "      Building API server..."
  pnpm --filter @workspace/api-server run build

  echo "      Building React frontend..."
  BASE_PATH=/ pnpm --filter @workspace/braintam run build

  echo "      Build complete."
else
  echo ""
  echo "[2/5] Using committed dist/ (no rebuild). Pass --rebuild to force."
fi

# ── 3. Verify the built entry point exists ────────────────────
echo ""
echo "[3/5] Verifying build output..."

if [[ ! -f "$ENTRY" ]]; then
  echo ""
  echo "ERROR: $ENTRY not found!"
  echo ""
  echo "  The dist files were not found. Possible causes:"
  echo "    1. git pull did not include dist/ (check .gitignore)"
  echo "    2. Run './deploy.sh --rebuild' to rebuild on this machine"
  echo ""
  exit 1
fi

if [[ ! -d "artifacts/braintam/dist/public" ]]; then
  echo ""
  echo "ERROR: artifacts/braintam/dist/public not found!"
  echo "  Frontend build output is missing. Run './deploy.sh --rebuild'."
  exit 1
fi

echo "      ✓ artifacts/api-server/dist/index.mjs"
echo "      ✓ artifacts/braintam/dist/public/"

# ── 4. Restart PM2 ────────────────────────────────────────────
echo ""
echo "[4/5] Restarting PM2 process '$APP_NAME'..."

if pm2 describe "$APP_NAME" &>/dev/null; then
  pm2 restart "$APP_NAME" --update-env
  pm2 save
  echo "      ✓ Restarted existing PM2 process"
else
  echo "      '$APP_NAME' not found in PM2. Starting fresh..."
  echo "      (Set env vars in ecosystem.config.js or PM2 environment first)"

  if [[ -f "ecosystem.config.js" ]]; then
    pm2 start ecosystem.config.js
    pm2 save
    echo "      ✓ Started via ecosystem.config.js"
  else
    echo ""
    echo "ERROR: ecosystem.config.js not found."
    echo "  Create it first — see DEPLOYMENT.md for the template."
    exit 1
  fi
fi

# ── 5. Verify the server is responding ────────────────────────
echo ""
echo "[5/5] Verifying server health..."
sleep 3

if curl -sf "http://localhost:${PORT}/api/healthz" -o /dev/null; then
  echo "      ✓ /api/healthz → 200 OK"
else
  echo "      ✗ /api/healthz did not respond. Check: pm2 logs $APP_NAME"
fi

if curl -sf "http://localhost:${PORT}/" -o /dev/null; then
  echo "      ✓ / (React SPA) → responding"
else
  echo "      ✗ / did not respond. Check: pm2 logs $APP_NAME"
fi

echo ""
echo "  Listening on port:"
ss -tulpn 2>/dev/null | grep ":${PORT}" | head -3 || \
  netstat -tlnp 2>/dev/null | grep ":${PORT}" | head -3 || \
  echo "      (ss/netstat not available)"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Deploy complete!"
echo "  Live: https://braintam.com"
echo "  Logs: pm2 logs $APP_NAME"
echo "══════════════════════════════════════════════════════════"
echo ""
