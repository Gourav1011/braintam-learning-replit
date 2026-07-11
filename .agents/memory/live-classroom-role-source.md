---
name: Live classroom role must come from useAuth, not URL
description: The role shown in live-classroom.tsx was read from URL ?role= param, not from the authenticated session — causing teachers/admins navigating without URL params to appear as "student".
---

**The bug:** `live-classroom.tsx` read `role` from `search.get("role") ?? "student"` while `useAuth()` was only used for `name` and `userId`. Any staff member navigating to `/live/:id` without a `?role=teacher` query param got `role = "student"`, hiding all teacher/mentor controls.

**The fix:** Destructure `role: authRole` from `useAuth()` and use it as the primary source:
```js
const { student: authIdentity, role: authRole } = useAuth();
const role = (authRole ?? search.get("role") ?? "student").toLowerCase();
```

**Why:** `useAuth()` fetches `/api/student/profile` using the staff token or Clerk-backed student token and returns the DB-authoritative role. URL params were always unreliable (no nav link ever passed them). The fix makes auth the canonical role source, with URL as last-resort fallback.

**How to apply:** Any page that determines role/identity for real-time sessions (chat, presence, LiveKit, stage) must derive `role` from `useAuth()` first, not from `window.location.search`. Check `authRole` is non-null before falling back.
