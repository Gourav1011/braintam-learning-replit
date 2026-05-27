#!/usr/bin/env bash

# ===================================================================
# Braintam Production Build Script
# ===================================================================
# Run this on your Linux VPS to build the entire project for production.
#
# IMPORTANT: Before first execution, make this script executable:
#   chmod +x build.sh
#
# Then run it with:
#   ./build.sh
# ===================================================================

set -euo pipefail

echo "══════════════════════════════════════════════════════════════════════════════════"
echo "  Braintam Production Build"
echo "═══════════════════════════════════════════════════════════════════════════════════════════"

# Set required environment variables for production build
export PORT=3000
export BASE_PATH=/

echo ""
echo "[1/3] Environment variables set:"
echo "      PORT=$PORT"
echo "      BASE_PATH=$BASE_PATH"
echo ""

# Ensure pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "ERROR: pnpm is not installed. Please install it first:"
    echo "       npm install -g pnpm"
    exit 1
fi

echo "[2/3] Installing dependencies with pnpm..."
pnpm install --frozen-lockfile

echo ""
echo "[3/3] Building all packages for production..."
pnpm run build

echo ""
echo "══════════════════════════════════════════════════════════════════════════════════"
echo "  Build completed successfully!"
echo "═══════════════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Static files:  artifacts/braintam/dist/public/"
echo "  API server:    artifacts/api-server/dist/"
echo ""
echo "  Next steps on your VPS:"
echo "    • Serve the frontend (e.g., nginx -> dist/public)"
echo "    • Run the API server:  PORT=3000 node artifacts/api-server/dist/index.js"
echo "    • Set DATABASE_URL and SESSION_SECRET in your server env"
echo ""
