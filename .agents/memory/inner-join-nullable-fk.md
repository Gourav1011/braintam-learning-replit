---
name: innerJoin silently drops nullable-FK rows
description: A row with a null foreign key vanishes from query results if joined with innerJoin instead of leftJoin.
---

Drizzle/SQL `innerJoin` excludes any row where the join column is `NULL`. If a table's FK to another table is nullable (e.g. `coursesTable.subjectId` is nullable because some course types attach subjects via a separate junction table instead), an `innerJoin` on that column will silently drop those rows from the result set — no error, just missing data.

**Why:** In Braintam, mastery courses attach subjects via `course_subjects` (junction table) rather than setting `coursesTable.subjectId` directly. A teacher's "my courses" query joined `subjectsTable` via `coursesTable.subjectId` with `innerJoin`, so any mastery course with a null `subjectId` disappeared entirely from that teacher's course list — even though the teacher was correctly assigned to it in `teacher_courses`.

**How to apply:** Whenever writing a join against a column that is nullable in the schema, default to `leftJoin` unless you specifically want to filter out rows with a null FK. Check the schema's `pgTable` definition for `.notNull()` before choosing join type.
