---
name: LiveKit room isolation and connection decoupling
description: How Braintam isolates simultaneous live classes into separate LiveKit rooms and keeps LiveKit independent from Socket.IO connection state.
---

- Each live-class DB record gets a deterministic room name `braintam-live-<liveClassId>` (not a random suffix), written once via an `isNull` guard update so concurrent first-joiners never race-overwrite it.

**Why:** random per-mint room name suffixes (`session-<id>-<hex>`) still worked because the value was persisted on first write, but a fixed deterministic name is simpler to reason about, matches Socket.IO's own per-class room keying, and avoids any ambiguity if the guard update ever races.

**How to apply:** any code minting a LiveKit token for a live class must read `liveClassesTable.liveKitRoomName` first, and only generate+persist a new name via `update(...).where(and(eq(id), isNull(liveKitRoomName)))` if it's missing — never overwrite an existing value.

- LiveKit connection must never be gated on Socket.IO's `connected` state (`enabled: connected` was a bug) — gate it only on having a real authenticated identity + a valid non-demo numeric session id. Socket.IO chat/presence and LiveKit media are independent connections and must degrade independently (chat drops shouldn't kill video, video reconnecting shouldn't kill chat).
