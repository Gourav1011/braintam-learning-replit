---
name: Workplace task realtime visibility
description: Recipient rules for realtime Workplace task events.
---

Task realtime updates must be emitted only to the task assignee, assigner, and any prior or replacement assignee affected by a change. Conversation membership alone is not permission to receive task payloads.

**Why:** Group conversations can contain staff who may read messages but are not permitted to open task details. Sending complete task payloads to a conversation room would expose titles, descriptions, CRM references, and status outside the task access policy.

**How to apply:** Use user-scoped realtime delivery for task create, status, reassignment, and remark updates. The client can invalidate its task and badge queries from an opaque task event, but never broadcast a full task record to every conversation member.