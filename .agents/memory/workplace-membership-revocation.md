---
name: Workplace membership revocation
description: Security invariant for removing a member from a private Workplace conversation.
---

When removing a member from a private Workplace conversation, set a per-user/conversation revocation fence before the asynchronous database removal starts. Commit both the membership removal and deletion of that member's conversation-scoped notifications before changing realtime state, then evict every affected socket from the conversation room and deliver the removal event.

**Why:** A removal notice sent before the membership write creates a window for a stale membership check to rejoin the conversation room. Retained message or task notifications can also reveal private excerpts after REST access is revoked.

**How to apply:** Treat removal as a revocation boundary. Every conversation authorization helper and scoped user-room delivery path must honor the fence immediately (not only the post-transaction DB state). Filter notification reads, purge matching client cache entries, and include concurrent join/removal coverage whenever this flow changes.