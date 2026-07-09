---
name: LiveKit live-class integration patterns
description: How LiveKit was layered onto Braintam's existing Socket.IO live-class player without redesigning chat/polls/attendance/stage logic.
---

- LiveKit only owns teacher video/audio/screen-share and time-boxed student stage cam/mic. Chat, polls, attendance, stage invite/remove, and mentor logic stay on the existing Socket.IO event bus — do not migrate that logic into LiveKit data channels.
- Frontend must never decide who can publish/see teacher-role video. The LiveKit access token's metadata JSON carries a server-set `role` field (minted in `livekit.ts`/`routes/livekit.ts`); the frontend only reads that field to decide how to render (e.g. show teacher tile), never to grant capability. Grants themselves are enforced by backend-issued LiveKit permissions on token mint / publish-permission update.
- The 60s stage timer is backend-authoritative (lives in `socket.ts`, drives LiveKit publish permission grant/revoke on invite/accept/remove/disconnect/class-end); the frontend only renders a countdown from a `stageExpiresAt` epoch it receives, it never owns the timer.
- `poll_analytics` (per-student, per-poll rows with `isCorrect`, `responseTimeMs`, `mentorGroupId`, permanent/never deleted) doubles as both the group-scoped Top-20 leaderboard source and the student's permanent poll-history feed — no separate history table was needed, just two different queries/filters over the same table.
- This repo mixes contract-first OpenAPI/Orval-generated hooks with plain `fetch()` + Bearer-token calls for simpler auxiliary endpoints (e.g. `/student/my-mentor`, `/student/poll-history`, `/live/:sessionId/livekit-token`) — not every route needs an OpenAPI entry; existing precedent (`my-mentor`, `my-courses`) already does this.
