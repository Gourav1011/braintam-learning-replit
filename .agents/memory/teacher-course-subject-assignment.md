---
name: Program-based teacher assignment model
description: How teacher-to-course/subject assignment differs from mentor assignment, and inactive-teacher guard rails
---

Teachers are assigned via Program (Ignite/Mastery) → Course → Subject, not locked to a single grade like Mentors are. A teacher can teach multiple grades/subjects/courses simultaneously.

**Why:** the original schema/UI conflated teacher assignment with the grade-scoped mentor model, which doesn't reflect how Braintam actually staffs teachers (one teacher often covers a subject across several course/grade combinations).

**How to apply:**
- `teacher_courses.courseSubjectId` is nullable: `null` = whole-course assignment (legacy/simple case), set = teacher is the subject-specific teacher for that one course_subject. Unique constraint is on `(teacherId, courseId, courseSubjectId)` so a teacher can hold multiple subject-level assignments within the same course.
- Any endpoint that creates a teacher assignment (`POST /admin/teacher-courses`, `POST /admin/cc/teachers/:id/assignments`) must reject inactive teachers (`isActive === false`) with a 400.
- Live-class scheduling (`POST`/`PATCH /admin/live-classes`) must run a date+time conflict check (`findTeacherScheduleConflict()`) against the teacher's existing classes and return 409 on overlap, and 400 if the teacher is inactive. This is calendar-aware (actual date+time), not a weekly recurring grid.
- Deactivating a teacher who has active course assignments or upcoming live classes should return 409 with `requiresConfirmation: true` plus the counts, and only proceed on an explicit `force: true` retry — never silently deactivate someone mid-schedule.
- Teacher-picker dropdowns across the app (assignment forms, live-class scheduling) should only list active teachers to avoid assigning inactive ones through the UI, even though the backend also enforces it.
