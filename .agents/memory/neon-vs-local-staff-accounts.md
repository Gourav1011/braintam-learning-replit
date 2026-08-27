---
name: DATABASE_URL and NEON_DATABASE_URL can silently diverge
description: Local Postgres (DATABASE_URL) and the Neon cloud DB (NEON_DATABASE_URL) are separate databases with different rows; staff/test accounts created in one do not exist in the other.
---

The API server always reads from `NEON_DATABASE_URL` at runtime (see replit.md Run & Operate). `DATABASE_URL` is a separate local Postgres instance, useful only for psql testing.

**Why this matters:** it's easy to `psql "$DATABASE_URL"` out of habit, see accounts that look right, and wrongly conclude a login/feature works — when the actual runtime DB (Neon) has completely different or missing rows. This caused a real incident: teacher login appeared broken because no `role='teacher'` user existed in the Neon DB, even though the local DB and replit.md's documented staff table both listed teacher-like accounts.

**How to apply:** when debugging any staff/user/login/data issue, always query `NEON_DATABASE_URL` first, not `DATABASE_URL`. The workspace SQL helper targets the local database, so use a credential-safe `psql "$NEON_DATABASE_URL"` check for runtime auth verification. If replit.md's "Staff accounts" table hasn't been verified against Neon recently, treat it as unverified and re-check live before trusting documented credentials.
