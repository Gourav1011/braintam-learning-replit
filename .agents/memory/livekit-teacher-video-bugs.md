---
name: LiveKit teacher video production bugs
description: Root causes of teacher camera/audio not visible to students in production (VPS) live classroom
---

## The Rule
Three bugs compound to cause "teacher camera is off" on VPS while local preview looks fine.

**Bug 1 — `super_admin` excluded from `isStaff`** (live-classroom.tsx)
```js
// WRONG:
const isStaff = role === "teacher" || role === "admin";
// CORRECT:
const isStaff = role === "teacher" || role === "admin" || role === "super_admin";
```
Camera/mic LiveKit calls are gated on `isStaff`. super_admin sees local preview (getUserMedia works) but LiveKit never publishes. Fixed in live-classroom.tsx line ~423.

**Bug 2 — Dual `getUserMedia` competing for camera** (live-classroom.tsx toggleCamera)
- Old: called `getUserMedia({ video: true })` for local preview + then `livekit.setCamera(true)` which calls getUserMedia again internally = two competing streams. On some hardware the second capture fails silently.
- Fix: removed the manual `getUserMedia`. Use only `livekit.setCamera(true)` then `livekit.attachLocalCameraTo(videoRef.current)` to attach LiveKit's local track to the preview element.

**Bug 3 — `teacherVideoRef` null when `TrackSubscribed` fires** (race condition)
- Old: `<video ref={livekit.teacherVideoRef}>` only mounted when `teacherInfo?.online`. If LiveKit fires TrackSubscribed before Socket.IO delivers roomState (sets teacherInfo), ref is null → attach silently skips, never retried.
- Fix: always mount `<video ref={livekit.teacherVideoRef}>` for non-staff users (just `display: none` when not needed). Moved outside the `teacherInfo?.online` conditional in live-classroom.tsx.

**Bug 4 — Missing TrackMuted/TrackUnmuted handlers** (use-livekit.ts)
- Without these, a track that starts muted on first publish never triggers re-render when it unmutes.
- Added `RoomEvent.TrackMuted` / `RoomEvent.TrackUnmuted` handlers.

## Why
- Bugs 1+2 cause teacher to never publish. Bug 3 causes student to miss the attach even when teacher does publish. All three needed for reliable VPS operation.
- Replit dev worked because test user was `role=teacher` (not super_admin) and network timing favored socket-before-livekit.

## How to Apply
- Any time camera/mic or teacher-video is broken on VPS but works locally, check these three things first.
- `isStaff` must include `super_admin` everywhere teacher-level actions are gated.
- Never call `getUserMedia` separately for teacher preview — always reuse LiveKit's local track.
- Video/audio ref elements for remote participants must always be in the DOM, not conditionally rendered.
