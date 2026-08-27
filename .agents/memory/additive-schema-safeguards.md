---
name: Additive schema safeguards
description: How to deploy new additive database tables when full schema push is blocked by unrelated drift.
---

For backwards-compatible runtime schema additions, keep the schema in Drizzle and make API initialization idempotently add every field and index that an affected query reads before serving requests.

**Why:** The existing database can contain unrelated schema drift that makes a full Drizzle push demand an unsafe, interactive change to existing tables. A fresh deployment must not run new routes against missing additive tables.

**How to apply:** Use this pattern only for backward-compatible, additive columns, tables, and indexes. For `select()` queries, include every schema field they project. Do not use it to alter or delete existing columns, constraints, or data; those need a deliberate migration.