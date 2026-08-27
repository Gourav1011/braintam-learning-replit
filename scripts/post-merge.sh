#!/bin/bash
set -e

# Do not run `drizzle-kit push` here. The shared database has existing schema
# drift, and Drizzle can prompt to truncate live rows when it reconciles it.
# Runtime-safe additive schema changes are applied by the API startup guard.
pnpm install --frozen-lockfile --prefer-offline
pnpm run typecheck:libs
