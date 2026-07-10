---
name: LiveKit teacher-role detection must include admin/super_admin
description: Why use-livekit.ts checks role in {teacher, admin, super_admin}, not just "teacher"
---

`use-livekit.ts` decides whether a remote participant is "the teacher" (and therefore whether to
attach their video/audio and show `teacherPresent`) by parsing `participant.metadata.role`. It
originally only matched `role === "teacher"`.

**Why:** Live classes can be taught by staff whose account role is `admin` or `super_admin` (e.g.
a super_admin covering a class), and `livekit.ts`'s `mintLiveKitToken` grants `canPublish` to
those roles too. With the narrow check, their video/audio silently never rendered for
mentors/students even though they were correctly publishing.

**How to apply:** Use the `isTeacherRole(role)` helper (checks teacher/admin/super_admin) anywhere
you're deciding "is this participant the instructor broadcasting into the room" — don't
reintroduce a bare `=== "teacher"` string check.
