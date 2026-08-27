---
name: Embedded Workplace navigation
description: Keeps Workplace integrated into existing staff portal layouts and navigation.
---

Workplace must remain embedded within the existing Admin/Super Admin, Teacher, Academic Mentor, and Ignite/Sales Mentor portals. It must not be exposed as a standalone routed staff workspace or wrapped in the generic staff layout, because that duplicates the owning portal's header and navigation.

**Why:** Staff use their existing portal session, layout, and navigation. A second shell is confusing and breaks the intended portal-specific navigation experience.

**How to apply:** Add new Workplace destinations as selected sections of the existing portal navigation and pass the selection into the embedded Workplace component. Do not add a separate Workplace route, login, dashboard, or application shell.