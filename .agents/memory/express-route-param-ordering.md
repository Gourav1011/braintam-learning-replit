---
name: Express route param ordering
description: Static sub-paths (e.g. /schedule, /find-available) must be registered before a /:id route on the same base path, or Express matches them as the id param.
---

Any `router.get("/resource/:id", ...)` will swallow requests to `/resource/someStaticPath` unless the static route is registered first. This causes confusing `{"error":"Invalid id"}`-style failures that look like an auth or query bug but are actually route-ordering.

**Why:** Express matches routes in registration order, and `:id` is a wildcard segment that matches any literal path token.

**How to apply:** When adding a new static sub-route under an existing `/:id`-based resource, always place it above the `:id` route in the file. After changing route order, restart the server workflow — a stale running process (from before the file edit was saved) can still exhibit the old behavior even though the source looks correct, so verify with a live curl request post-restart, not just a source read.
