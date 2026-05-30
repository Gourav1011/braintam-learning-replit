---
name: Homework MCQ type detection
description: How to reliably detect MCQ homework; DB default pitfall and the fix.
---

The `homework_type` column in Neon DB defaulted to `'writing'::text` for all rows
created before the column existed. Even after the column was added via drizzle-kit
push, rows inserted without an explicit `homeworkType` value in the API call got
the DB default.

**Rule:** Never trust `homework_type` alone to detect MCQ homework.

**How to apply:**
- **Student side (homework.tsx):** `isMcq = questionsJson.length > 0` — ignore homeworkType field entirely.
- **Teacher portal openEditHw:** detect type from `questionsJson` length, fall back to `homeworkType`.
- **Teacher portal createHomework:** use `effectiveType = filledQuestions.length > 0 ? "mcq" : hwType` so toggle-state mismatch never stores wrong type.
- **DB fix:** `UPDATE homework SET homework_type='mcq' WHERE questions_json IS NOT NULL AND homework_type='writing'` — run once to fix historical rows.

**Why:** The Drizzle-kit push adds the column with a DEFAULT; existing rows get the default value silently. Any row inserted without explicitly passing `homeworkType` in the request body also uses the default.
