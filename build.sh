#!/usr/bin/env bash
# =============================================================================
# Braintam Local Build Script
# =============================================================================
# Run this in the Replit environment (or locally) to produce the dist/ files
# that get committed to git and deployed to the VPS.
#
# For VPS deployment, use deploy.sh instead.
#
# Usage:
#   chmod +x build.sh
#   ./build.sh
# =============================================================================

set -euo pipefail

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Braintam Build  —  $(date '+%Y-%m-%d %H:%M:%S')"
echo "══════════════════════════════════════════════════════════"

# Ensure pnpm is available
if ! command -v pnpm &>/dev/null; then
  echo "ERROR: pnpm is not installed. Run: npm install -g pnpm"
  exit 1
fi

# ── 1. Build React frontend ────────────────────────────────────
echo ""
echo "[1/2] Building React frontend..."
BASE_PATH=/ pnpm --filter @workspace/braintam run build
echo "      ✓ artifacts/braintam/dist/public/"

# ── 2. Build API server ────────────────────────────────────────
echo ""
echo "[2/2] Building API server..."
pnpm --filter @workspace/api-server run build
echo "      ✓ artifacts/api-server/dist/index.mjs"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Build complete!"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "  To commit and deploy:"
echo "    git add artifacts/api-server/dist/ artifacts/braintam/dist/"
echo "    git commit -m 'Deploy: <description>'"
echo "    git push origin main"
echo "    # then on VPS: ./deploy.sh"
echo ""
echo "  Production entrypoint:"
echo "    PORT=5000 NODE_ENV=production node --enable-source-maps \\"
echo "      artifacts/api-server/dist/index.mjs"
echo ""
