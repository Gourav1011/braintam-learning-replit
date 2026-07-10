---
name: DemoPaywall redesigned as dismissible popup
description: Why the demo-student unlock prompt is a timed popup, not a blocking overlay
---

The original `DemoPaywall` (artifacts/braintam/src/components/demo-paywall.tsx) blurred and
covered the entire page for demo students with a permanent `absolute inset-0 z-10` overlay and
no close button — so demo students could never actually see their courses, live classes, etc.

**Why:** Product requirement — demo students should see all real content; the "enroll to unlock
everything" prompt should be an interruption, not a wall.

**How to apply:** `DemoPaywall` now always renders `children` unblurred, and shows a separate
`fixed inset-0 z-[9999]` modal (with an X close button) that auto-appears ~15s after mount for
demo students. Don't reintroduce a blocking overlay pattern here — any future "upsell" UI for
demo students should follow the same dismissible-popup approach.
