---
name: Live classroom identity must come from auth, not URL params
description: /live/:sessionId in Braintam relied on name/userId query params that no nav link ever populated, causing every visitor to collide into a shared fake identity.
---

The live classroom page (`live-classroom.tsx`) read `name`/`userId` from URL query params, defaulting to literal `name="Student"`, `userId="u-student"` when absent. No navigation link anywhere in the app (course detail, live-classes list, teacher/admin dashboards, mentor observer tab, sales mentor portal) ever actually passed those params in.

**Why:** every visitor — regardless of real role or identity — collided into the same fake shared identity. This broke chat display names (everyone showed as "Student"), teacher/mentor presence detection, and likely attendance/raise-hand accuracy, because there was no way to distinguish individual users server-side either.

**How to apply:** the fix is to derive identity from the authenticated session (`useAuth()`, resolving Clerk user for students or the staff token identity for teacher/mentor/admin) and only fall back to URL params if auth is unavailable. Also check `isStaffPath()`-style route matchers — if a route isn't included in the staff-path allowlist, staff users visiting it won't get their token-based identity resolved via `useAuth()` even after the fallback logic is fixed. Any time you add real-time/collaborative pages driven by query-string identity, verify at least one real caller actually supplies it — don't assume nav links were updated in lockstep with the page.
