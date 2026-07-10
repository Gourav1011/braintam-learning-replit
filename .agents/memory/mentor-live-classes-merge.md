---
name: Mentor live-classes tab must merge two independent data sources
description: /mentor/live-sessions only queried demo_sessions; course-based (teacher-scheduled "mastery") live_classes were invisible to mentors until merged in separately.
---

The mentor portal's live-classes tab is fed by two structurally different scheduling systems that must both be queried and normalized into one shape:

1. `demo_sessions` (joined to `demo_batches`) — grade/mentor-assignment based, used for demo batches.
2. `live_classes` (joined to `courses`) — course-based "mastery" classes teachers schedule, scoped by `courseId`.

**Why:** these were built independently over time, so a mentor is only shown demo sessions and never sees a course live class a teacher scheduled for a course their assigned student is enrolled in, even though the mentor should see it instantly.

**How to apply:** to determine which courses a mentor should see, resolve `courseId`s from `enrollments` for the mentor's assigned student IDs (via `getMentorStudentIds`), plus courses matching any grade-team assignments (`grade_mentor_assignments`). Query `live_classes` for those `courseId`s, normalize field names to match the demo-session shape (topic, scheduledAt, duration, status, joinUrl, batchTitle/batchGrade/batchSubject substitutes from `courses`/`subjects`), then merge+sort with demo sessions before returning. Reuse the `status` field synced by `liveClassStatusSync.ts` (values: live/upcoming/completed for live_classes; live/scheduled/completed for demo_sessions) rather than re-deriving live/upcoming/completed from timestamps.
