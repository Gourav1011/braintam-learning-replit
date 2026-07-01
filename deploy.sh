#!/usr/bin/env bash
# =============================================================================
# Braintam VPS Deployment Script
# =============================================================================
# Architecture: Single Express process on PORT=5000
#   Browser → Nginx → localhost:5000 (API + React SPA + Socket.IO + Neon DB)
#
# PM2 must contain exactly ONE process:  braintam-api → online
# Port 3000 and the braintam-live process are deprecated and must NOT exist.
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
echo "  Braintam Deploy  —  $(date '+%Y-%m-%d %H:%M:%S IST')"
echo "══════════════════════════════════════════════════════════"

# ── 1. Pull latest code (includes pre-built dist/) ────────────
echo ""
echo "[1/6] Pulling latest code from GitHub..."
if ! git pull origin main; then
  echo ""
  echo "ERROR: git pull failed!"
  echo "  Check your network, credentials, or merge conflicts."
  echo "  Run: git status  |  git log --oneline -5"
  exit 1
fi
echo "      ✓ git pull succeeded"

# ── 2. Optional rebuild ───────────────────────────────────────
if [[ "$REBUILD" == true ]]; then
  echo ""
  echo "[2/6] Rebuilding (--rebuild flag set)..."

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
  echo "[2/6] Using committed dist/ (no rebuild). Pass --rebuild to force."
fi

# ── 3. Verify build output ────────────────────────────────────
echo ""
echo "[3/6] Verifying build output..."

MISSING=false

if [[ ! -f "$ENTRY" ]]; then
  echo "ERROR: $ENTRY not found!"
  echo "  Possible causes:"
  echo "    1. git pull did not include dist/ (check .gitignore)"
  echo "    2. Run './deploy.sh --rebuild' to build on this machine"
  MISSING=true
fi

if [[ ! -d "artifacts/braintam/dist/public" ]]; then
  echo "ERROR: artifacts/braintam/dist/public/ not found!"
  echo "  Frontend build output is missing. Run './deploy.sh --rebuild'."
  MISSING=true
fi

if [[ ! -f "artifacts/braintam/dist/public/index.html" ]]; then
  echo "ERROR: artifacts/braintam/dist/public/index.html not found!"
  echo "  Frontend build is incomplete. Run './deploy.sh --rebuild'."
  MISSING=true
fi

if [[ "$MISSING" == true ]]; then
  exit 1
fi

echo "      ✓ artifacts/api-server/dist/index.mjs"
echo "      ✓ artifacts/braintam/dist/public/index.html"

FE_VERSION="?"
FE_COMMIT="?"
FE_BUILD="?"
if [[ -f "artifacts/braintam/dist/public/version.json" ]]; then
  FE_VERSION=$(python3 -c "import json; d=json.load(open('artifacts/braintam/dist/public/version.json')); print(d.get('version','?'))" 2>/dev/null || echo "?")
  FE_COMMIT=$(python3  -c "import json; d=json.load(open('artifacts/braintam/dist/public/version.json')); print(d.get('commit','?'))"  2>/dev/null || echo "?")
  FE_BUILD=$(python3   -c "import json; d=json.load(open('artifacts/braintam/dist/public/version.json')); print(d.get('buildTime','?'))" 2>/dev/null || echo "?")
  echo "      Frontend version : $FE_VERSION  ($FE_COMMIT)"
fi

# ── 4. Restart PM2 ────────────────────────────────────────────
echo ""
echo "[4/6] Restarting PM2 process '$APP_NAME'..."

if pm2 describe "$APP_NAME" &>/dev/null; then
  pm2 restart "$APP_NAME" --update-env
  pm2 save
  echo "      ✓ Restarted existing PM2 process"
else
  echo "      '$APP_NAME' not found in PM2. Starting fresh..."

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

# ── 5. Hard-verify port and API ───────────────────────────────
echo ""
echo "[5/6] Verifying server health..."
sleep 4

# Hard check: port must be listening
PORT_OPEN=false
for i in 1 2 3; do
  if ss -tulpn 2>/dev/null | grep -q ":${PORT}" || \
     netstat -tlnp 2>/dev/null | grep -q ":${PORT}"; then
    PORT_OPEN=true
    break
  fi
  echo "      Waiting for port ${PORT}... (attempt $i/3)"
  sleep 2
done

if [[ "$PORT_OPEN" == false ]]; then
  echo ""
  echo "ERROR: Port ${PORT} is NOT listening after restart!"
  echo "  The process may have crashed on startup."
  echo "  Check: pm2 logs $APP_NAME --lines 50"
  exit 1
fi
echo "      ✓ Port ${PORT} is listening"

# Hard check: /api/version must respond
if ! curl -sf "http://localhost:${PORT}/api/version" -o /tmp/braintam_version.json 2>/dev/null; then
  echo ""
  echo "ERROR: GET /api/version did not respond on port ${PORT}!"
  echo "  The server is listening but not accepting HTTP requests."
  echo "  Check: pm2 logs $APP_NAME --lines 50"
  exit 1
fi
echo "      ✓ /api/version responded"

BE_VERSION=$(python3 -c "import json; d=json.load(open('/tmp/braintam_version.json')); print(d.get('version','?'))" 2>/dev/null || echo "?")
BE_COMMIT=$(python3  -c "import json; d=json.load(open('/tmp/braintam_version.json')); print(d.get('commit','?'))"  2>/dev/null || echo "?")
BE_BUILD=$(python3   -c "import json; d=json.load(open('/tmp/braintam_version.json')); print(d.get('buildTime','?'))" 2>/dev/null || echo "?")
BE_NODE=$(python3    -c "import json; d=json.load(open('/tmp/braintam_version.json')); print(d.get('nodeVersion','?'))" 2>/dev/null || echo "?")

# Soft checks (warn, don't fail)
if curl -sf "http://localhost:${PORT}/api/healthz" -o /dev/null; then
  echo "      ✓ /api/healthz → 200 OK"
else
  echo "      ⚠ /api/healthz did not respond (non-fatal)"
fi

if curl -sf "http://localhost:${PORT}/" -o /dev/null; then
  echo "      ✓ / (React SPA) → responding"
else
  echo "      ⚠ / did not respond (non-fatal)"
fi

# ── 6. Summary ────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────────────────"
echo "  Deploy Summary"
echo "──────────────────────────────────────────────────────────"
echo ""
echo "  ┌─ Frontend ───────────────────────────────────────────"
if [[ "$FE_VERSION" != "?" ]]; then
  echo "  │  Version    : $FE_VERSION"
  echo "  │  Git Commit : $FE_COMMIT"
  echo "  │  Build Time : $FE_BUILD"
else
  echo "  │  (version.json not found — run './deploy.sh --rebuild')"
fi
echo "  │"
echo "  ├─ Backend API ────────────────────────────────────────"
echo "  │  Version    : $BE_VERSION"
echo "  │  Git Commit : $BE_COMMIT"
echo "  │  Build Time : $BE_BUILD"
echo "  │  Node.js    : $BE_NODE"
echo "  │"

if [[ "$FE_COMMIT" != "?" && "$BE_COMMIT" != "?" ]]; then
  if [[ "$FE_COMMIT" == "$BE_COMMIT" ]]; then
    echo "  │  Sync       : ✓ Frontend and backend on same commit ($FE_COMMIT)"
  else
    echo "  │  Sync       : ⚠ MISMATCH — frontend=$FE_COMMIT  backend=$BE_COMMIT"
    echo "  │    Fix      : ./deploy.sh --rebuild"
  fi
  echo "  │"
fi

echo "  ├─ PM2 Status ─────────────────────────────────────────"
pm2 list 2>/dev/null | grep -E "App name|braintam|online|stopped|errored" | sed 's/^/  │  /' \
  || echo "  │  (pm2 list unavailable)"
echo "  │"
echo "  └──────────────────────────────────────────────────────"
echo ""
echo "  Live : https://braintam.com"
echo "  Logs : pm2 logs $APP_NAME"
echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Deploy complete!"
echo "══════════════════════════════════════════════════════════"
echo ""
