---
name: Chat groupId branch must broadcast, not echo
description: In Braintam's live-class socket chat handler, the no-groupId branch (used by ALL course-based classes) only echoed messages back to the sender instead of broadcasting to the room.
---

`socket.ts`'s `chat:send` handler branches on whether the sender has a `groupId` (legacy mentor-group flow). Course-based live classes never set a `groupId`, so every course-based class — the majority of the product — fell into the `else` branch. That branch called `socket.emit(...)` (sender-only) instead of `io.to(globalRoom(sessionId)).emit(...)` (room broadcast), and skipped `persistChat`.

**Why:** this meant chat was effectively broken for the main class type: students/mentors never saw messages from anyone else (and depending on timing, not reliably even their own), even though the UI looked like a working chat box. This is an easy bug to miss because manual sender-side testing looks fine — you only notice when checking a second participant's view.

**How to apply:** whenever you see a role/feature branch (staff vs non-staff, groupId vs none, legacy vs new flow) inside a socket event handler, verify EVERY branch broadcasts to the shared room and persists data consistently. Don't assume the "default"/fallback branch was kept in sync with the "main" branch as the room model evolved. When debugging "messages not appearing for other users" bugs, check for `socket.emit` (single-socket) where `io.to(room).emit` (broadcast) was intended.
