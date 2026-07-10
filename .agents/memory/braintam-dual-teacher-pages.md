---
name: Braintam admin has two distinct Teacher UIs
description: Two separate "teachers" pages exist in the Braintam admin sidebar; verify which one a screenshot/request refers to before editing
---

The Braintam admin nav has two different entries that both look like "the Teachers page" but are separate React components hitting separate route namespaces:

1. **Command Center → Administration → "Teacher Management"** — `artifacts/braintam/src/pages/admin/command-center-teachers-tab.tsx`, rendered via `command-center-tab.tsx`. This is the original/legacy teacher admin view.
2. **Command Center → Analytics → "Teachers"** — `artifacts/braintam/src/pages/admin/teacher-analytics-tab.tsx`, rendered via `index.tsx`'s `teacher-analytics` tab. This is the page most commonly shown to the user (matches the "BTL CRM" branded screenshot with KPI cards: Total Teachers, Active Teachers, Live Classes Today, etc.).

**Why:** a redesign was mistakenly applied to file #1 while the user was actually looking at and referring to file #2, wasting a full session. Both files can visually look identical if one is copied into the other during a fix, which itself caused confusion ("why are both the same").

**How to apply:**
- Before making UI changes based on a screenshot, grep for unique text from the screenshot (e.g. a subtitle or KPI label) to find the exact component file, not just the sidebar label.
- Keep the two pages as separate files/components even if they end up sharing the same look — do not point both nav items at the same component, since the user may want them to diverge (e.g. one kept as legacy, one redesigned).
- Both pages can safely share the same backend endpoints (`/admin/cc/teachers*`, `/admin/teacher-courses`, `/admin/teachers/enriched`) — reuse there is fine and expected; it's specifically the two *frontend* views that must stay distinct files.
