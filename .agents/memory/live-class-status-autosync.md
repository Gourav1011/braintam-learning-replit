---
name: Live class status auto-sync
description: Why live_classes/demo_sessions status transitions run on a timer, not just teacher clicks
---

`live_classes.status` and `demo_sessions.status` were only ever changed by a teacher manually
hitting "Start Class" / "End Class" (PATCH `/teacher/live-classes/:id/status` or
`/teacher/sessions/:id/status`). Every portal (teacher/student/mentor) reads this same DB field
for its "LIVE" / "Ended" badge, so if the teacher forgot to click, or joined late, students and
mentors saw a stale status (e.g. "Upcoming" while the class was actually happening, or "Live"
long after it ended).

**Why:** Product requirement — status should auto-flip to live at `scheduledAt` and to
completed/grey at `scheduledAt + duration`, consistently everywhere, without depending on a
teacher's manual action.

**How to apply:** `artifacts/api-server/src/jobs/liveClassStatusSync.ts` runs every 30s (and once
at boot) and derives status purely from `scheduledAt`/`duration`, moving both tables forward
along upcoming/scheduled → live → completed. It never moves status backward, so a teacher's
manual early-start/early-end PATCH is still respected. If you add a new "live session"-shaped
table with a status field, register it in this same job rather than relying on manual PATCH only.

Also note: the OpenAPI enum for `live_classes.status` had drifted (`ended` in the spec vs
`completed` actually written by the DB/routes) — always check the real DB value teacher/admin
routes write before trusting the generated Zod enum's naming.
