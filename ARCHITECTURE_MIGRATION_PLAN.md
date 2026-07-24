# Braintam Classroom Architecture — Migration Plan

**Document status:** Awaiting approval before any code changes  
**Prepared by:** Architecture Review  
**Scope:** Production system — Replit → GitHub → Hostinger VPS

---

## 1. Current Architecture

### 1.1 Two Parallel Classroom Systems

Braintam currently runs **two completely independent classroom pipelines** that share only the live-classroom React page and the LiveKit media server.

```
IGNITE PIPELINE                    MASTERY PIPELINE
─────────────────                  ─────────────────
demo_batches                       courses / enrollments
     │                                      │
demo_sessions                       live_classes
     │                                      │
  /live/:id?type=ignite              /live/:id
     │                                      │
live-classroom.tsx (shared UI)     live-classroom.tsx (shared UI)
     │                                      │
use-livekit.ts → POST /api/live/:id/livekit-token
                       │
                livekit.ts ← ONLY queries live_classes  ← ROOT CAUSE OF BUG
```

### 1.2 Database Tables

#### `live_classes` (Mastery sessions)
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| title | text NOT NULL | |
| subject_id | integer | nullable |
| grade | integer NOT NULL | |
| batch_id | integer | nullable |
| course_id | integer | nullable — links to course enrollment |
| course_subject_id | integer | nullable |
| chapter_id | integer | nullable |
| topic_id | integer | nullable |
| teacher_id | integer | nullable |
| teacher | text NOT NULL | denormalized name |
| teacher_avatar | text | nullable |
| scheduled_at | timestamp NOT NULL | |
| duration | integer DEFAULT 60 | |
| status | text DEFAULT 'upcoming' | upcoming / live / completed |
| livekit_room_name | text UNIQUE | set on first token request |
| slide_url | text | nullable |
| is_published | boolean DEFAULT true | |
| is_archived | boolean DEFAULT false | |
| archived_at / archived_by | timestamp / integer | nullable |
| created_at | timestamp | |

#### `demo_sessions` (Ignite sessions)
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | **separate ID sequence from live_classes** |
| batch_id | integer NOT NULL | FK → demo_batches |
| title | text NOT NULL | |
| description | text | nullable |
| day_number | integer DEFAULT 1 | Day 1–5 within batch |
| subject | text | free-text, NOT a subject_id |
| teacher_id | integer | nullable |
| teacher_name | text | denormalized |
| scheduled_at | timestamp NOT NULL | |
| duration | integer DEFAULT 60 | |
| join_url | text | nullable |
| slide_url | text | nullable |
| recording_url | text | nullable |
| homework_text / homework_link | text | nullable |
| banner_url | text | nullable |
| status | text DEFAULT 'scheduled' | scheduled / live / completed |
| started_at / ended_at | timestamp | actual classroom timing |
| is_published | boolean DEFAULT true | |
| created_at | timestamp | |

#### `demo_batches` (Ignite scheduling container)
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| title / description | text | |
| teacher_id / teacher_name | integer / text | |
| mentor_id / mentor_name | integer / text | |
| start_date / end_date | timestamp | |
| status | text | |
| grade | integer | nullable |
| subject | text | free-text |
| total_days | integer DEFAULT 5 | |
| batch_code | text | |
| week_number / academic_year | integer / text | |

#### Shared session-linked tables (schema-level problem)
All of the following store a bare `session_id` integer with **no `session_type` discriminator**:

| Table | session_id type | Risk |
|-------|----------------|------|
| session_attendance | integer | IDs from live_classes and demo_sessions can collide |
| poll_analytics | integer | same collision risk |
| chat_messages | integer | same collision risk |
| stage_slots | text (string) | less risk, but still namespaced only by number |

Since `live_classes` and `demo_sessions` are separate tables with separate serial sequences, `live_classes.id = 42` and `demo_sessions.id = 42` can both exist simultaneously. Any attendance, poll, or chat record for session 42 is **ambiguous** — it could belong to either session.

### 1.3 API Routes

| Route | File | Queries |
|-------|------|---------|
| `GET /api/live/:sessionId` | `live.ts` | `live_classes` first, then `demo_sessions` fallback ✅ |
| `POST /api/live/:sessionId/livekit-token` | `livekit.ts` | **Only `live_classes`** ❌ |
| Socket.IO `getLiveKitRoomName()` | `socket.ts` | **Only `live_classes`** ❌ |
| `GET /api/demo-batches/*` | `demoBatches.ts` | `demo_sessions`, `demo_batches` |
| `POST /admin/demo-batches` | `demoBatches.ts` | Auto-generates 5 `demo_sessions` |
| Teacher dashboard | `teacher.ts` | Both `live_classes` and `demo_sessions` |
| Ignite admin CRM | `ignite.ts` | `demo_sessions` |

### 1.4 Frontend

- **One shared page**: `live-classroom.tsx` handles both session types
- **Type discrimination**: URL query param `?type=ignite` or absent (defaults to mastery)
- **`use-livekit.ts`**: Passes `sessionType` to token request URL — but backend ignores the `type` param; it only checks `live_classes`
- **Teacher portal**: Generates `/live/${s.id}?role=teacher&type=ignite` for demo sessions

### 1.5 Socket.IO

`socket.ts` calls `getLiveKitRoomName(sessionId)` which queries **only** `liveClassesTable`. For an Ignite session, this returns `null` → socket cannot connect to the LiveKit room.

---

## 2. Confirmed Problems

### Problem 1 — LiveKit Token 404 for Ignite Sessions (CRITICAL)
```
Teacher starts Ignite class
→ Frontend requests POST /api/live/:demoSessionId/livekit-token
→ livekit.ts queries live_classes WHERE id = demoSessionId
→ Not found (record is in demo_sessions, not live_classes)
→ 404 "Live class not found"
→ Ignite classrooms cannot use LiveKit
```

### Problem 2 — Socket Room Name Null for Ignite Sessions (CRITICAL)
```
Student/teacher connects via Socket.IO for sessionId = demoSessionId
→ getLiveKitRoomName() queries live_classes WHERE id = demoSessionId
→ Returns null
→ Stage, chat history, and live attendance don't link to the LiveKit room
→ Socket features degrade silently
```

### Problem 3 — Session ID Namespace Collision (MEDIUM-TERM RISK)
```
demo_sessions.id and live_classes.id are both serial sequences
Both could reach id = 42 simultaneously
session_attendance, poll_analytics, chat_messages for session 42 is ambiguous
→ Data corruption risk as usage grows
```

### Problem 4 — Authorization Logic Missing for Ignite Students (HIGH)
```
livekit.ts student check: mentorGroupsTable WHERE sessionId = id (from live_classes)
demo_sessions use demo_batch_enrollments, not mentor_groups
→ Even if the 404 were fixed, Ignite students would be rejected as unauthorized
```

### Problem 5 — Feature Duplication
Both pipelines need LiveKit, attendance, chat, polls, recordings, homework. All must be separately maintained and are currently separately buggy.

### Problem 6 — `demo_sessions` Has No `livekit_room_name` Column
`live_classes.livekit_room_name` is where room names are persisted. `demo_sessions` has no equivalent column, so even a naive fallback patch in `livekit.ts` would have nowhere to write the room name idempotently.

---

## 3. Architectural Assessment

**The team's proposed architecture is correct.** Consolidating into `live_classes` with a `class_type` discriminator is the right long-term design. The business programs (Ignite vs Mastery) are distinct; the classroom technology should not be.

However, there is a **two-speed approach** here:

- **Phase 0** — Minimal patch (1–2 hours): Fix the immediate 404 and socket issue so Ignite classrooms work today, without touching the DB schema. Zero migration risk.
- **Phase 1–3** — Structural consolidation (planned migration over days/weeks): Unify `demo_sessions` into `live_classes`, resolve the ID collision, simplify all routes.

This document covers both.

---

## 4. Recommended Architecture

### 4.1 Target State

```
live_classes (unified classroom record)
├── class_type: 'ignite' | 'mastery' | 'revision' | 'competition' | 'ptm'
├── ignite_batch_id → demo_batches (nullable, for scheduling context only)
├── livekit_room_name (already exists, unique)
└── All existing columns

demo_batches (scheduling/planning container — unchanged)
└── Scheduling metadata, no classroom technology

demo_batch_enrollments (student enrollment in an Ignite batch — unchanged)
└── Links students to a batch; individual sessions are in live_classes

Authorization:
├── Ignite: demo_batch_enrollments (student in batch) + teacher_id
└── Mastery: enrollments (course enrollment) + mentor_groups
```

### 4.2 Derived Benefits

1. Single token endpoint handles all session types
2. Single socket room resolver
3. No ID collision — one sequence for all classrooms
4. Attendance, polls, chat, stages: no ambiguity
5. All future class types (revision, PTM, competition) work immediately
6. Teacher portal shows one unified list; filter by `class_type`

---

## 5. Migration Plan

---

### Phase 0 — Emergency Fix (No Schema Change)
**Goal**: Make Ignite classrooms work on production TODAY.  
**Risk**: Minimal — additive logic only, no DB changes, no destructive changes.

#### 5.0.1 Add `livekit_room_name` to `demo_sessions`

```sql
ALTER TABLE demo_sessions
  ADD COLUMN IF NOT EXISTS livekit_room_name TEXT UNIQUE;
```

This is a nullable, additive column. Zero risk.

#### 5.0.2 Patch `livekit.ts`

After the existing `live_classes` lookup fails, fall back to `demo_sessions` using the same pattern as `live.ts`:

```typescript
// If not found in live_classes, try demo_sessions
if (!liveClass) {
  const [demoSession] = await db
    .select({ id: demoSessionsTable.id, teacherId: demoSessionsTable.teacherId,
               batchId: demoSessionsTable.batchId, liveKitRoomName: demoSessionsTable.liveKitRoomName })
    .from(demoSessionsTable)
    .where(eq(demoSessionsTable.id, sessionId))
    .limit(1);

  if (!demoSession) {
    res.status(404).json({ error: "Live class or demo session not found" });
    return;
  }
  // ... Ignite-specific authorization + room name write
}
```

**Authorization for Ignite**: Teacher checks `demoSession.teacherId === user.id`.  
Student/mentor checks: `demo_batch_enrollments` WHERE `batch_id = demoSession.batchId AND student_id = user.id`.

#### 5.0.3 Patch `socket.ts` — `getLiveKitRoomName()`

Extend the function to fall back to `demo_sessions.livekit_room_name` when `live_classes` returns null.

**Files to modify in Phase 0:**
- `lib/db/src/schema/demoSessions.ts` — add `liveKitRoomName` column
- `artifacts/api-server/src/routes/livekit.ts` — fallback to demo_sessions
- `artifacts/api-server/src/socket.ts` — getLiveKitRoomName fallback
- Run: `pnpm --filter @workspace/db run push` (additive migration only)

---

### Phase 1 — Schema Extension of `live_classes`
**Goal**: Add `class_type` and `ignite_batch_id` to `live_classes`.  
**Risk**: Low — additive columns only.

#### 5.1.1 Alter `live_classes`

```sql
ALTER TABLE live_classes
  ADD COLUMN IF NOT EXISTS class_type TEXT NOT NULL DEFAULT 'mastery',
  ADD COLUMN IF NOT EXISTS ignite_batch_id INTEGER REFERENCES demo_batches(id);

CREATE INDEX IF NOT EXISTS idx_live_classes_class_type ON live_classes(class_type);
CREATE INDEX IF NOT EXISTS idx_live_classes_ignite_batch ON live_classes(ignite_batch_id);
```

Existing rows default to `class_type = 'mastery'` — correct, no data transformation needed.

#### 5.1.2 Update `liveClasses.ts` schema

```typescript
classType: text("class_type").notNull().default("mastery"),
igniteBatchId: integer("ignite_batch_id"),  // FK → demo_batches.id
```

**Files to modify in Phase 1:**
- `lib/db/src/schema/liveClasses.ts`
- Run: `pnpm --filter @workspace/db run push`

---

### Phase 2 — Data Migration: `demo_sessions` → `live_classes`
**Goal**: Migrate all existing `demo_sessions` rows into `live_classes` with `class_type = 'ignite'`.  
**Risk**: Medium — requires careful ID remapping and backward compatibility.

#### 5.2.1 Migration Script (run once, on production)

```sql
-- Step 1: Insert demo_sessions into live_classes
INSERT INTO live_classes (
  title, grade, teacher_id, teacher, scheduled_at, duration, status,
  slide_url, livekit_room_name, is_published, created_at,
  class_type, ignite_batch_id
)
SELECT
  ds.title,
  COALESCE(db.grade, 0),
  ds.teacher_id,
  COALESCE(ds.teacher_name, 'Teacher'),
  ds.scheduled_at,
  ds.duration,
  CASE ds.status
    WHEN 'scheduled' THEN 'upcoming'
    WHEN 'live'      THEN 'live'
    WHEN 'completed' THEN 'completed'
    ELSE 'upcoming'
  END,
  ds.slide_url,
  ds.livekit_room_name,  -- preserves any existing room connections
  ds.is_published,
  ds.created_at,
  'ignite',
  ds.batch_id
FROM demo_sessions ds
LEFT JOIN demo_batches db ON db.id = ds.batch_id;

-- Step 2: Create a mapping table for ID remapping
CREATE TABLE demo_session_id_map (
  old_demo_session_id INTEGER PRIMARY KEY,
  new_live_class_id   INTEGER NOT NULL REFERENCES live_classes(id)
);
-- (Populate this from a JOIN on livekit_room_name or created_at+batch_id after the INSERT above)
```

#### 5.2.2 Remap Foreign Keys

Tables that reference `session_id` (which may currently contain `demo_sessions.id` values):

```sql
-- session_attendance
UPDATE session_attendance sa
SET session_id = m.new_live_class_id
FROM demo_session_id_map m
WHERE sa.session_id = m.old_demo_session_id;

-- poll_analytics, chat_messages — same pattern
-- stage_slots (session_id is TEXT there — remap string values)
UPDATE stage_slots
SET session_id = m.new_live_class_id::TEXT
FROM demo_session_id_map m
WHERE session_id = m.old_demo_session_id::TEXT;
```

**Note**: Because IDs from the two tables can collide, the mapping table is critical. Always verify counts before and after.

#### 5.2.3 Keep `demo_sessions` Read-Only

After migration, do NOT delete `demo_sessions`. Add a comment to the schema file: "DEPRECATED — retained for rollback. All writes go to live_classes."  
Set `is_published = false` on migrated rows to prevent double-display in any legacy queries still reading `demo_sessions`.

---

### Phase 3 — Route & Frontend Consolidation
**Goal**: Update all routes to read only from `live_classes`. Remove the `?type=ignite` bifurcation.  
**Risk**: Low, once Phase 2 is verified stable.

#### 5.3.1 Backend Route Changes

| File | Change |
|------|--------|
| `livekit.ts` | Remove demo_sessions fallback; query only live_classes. Authorization checks `class_type`. |
| `live.ts` | Remove demo_sessions fallback; query only live_classes. |
| `socket.ts` | `getLiveKitRoomName()` queries only live_classes. |
| `demoBatches.ts` | Creating a batch still generates `demo_sessions` rows as scheduling metadata → also creates corresponding `live_classes` rows with `class_type='ignite'` |
| `teacher.ts` | Teacher session list: query live_classes only, filtered by `teacher_id` |
| `ignite.ts` | Homework/recording/status updates target `live_classes` WHERE `class_type='ignite'` |

#### 5.3.2 Frontend Changes

| File | Change |
|------|--------|
| `use-livekit.ts` | Remove `sessionType` param — no longer needed |
| `live-classroom.tsx` | Remove `?type=ignite` detection — backend handles class_type |
| `teacher/index.tsx` | Remove `type=ignite` from navigation URLs |
| Student dashboard | Ignite join links: same `/live/:id` pattern, no type param |

#### 5.3.3 Authorization Unification in `livekit.ts`

```typescript
const classType = liveClass.class_type;  // 'ignite' | 'mastery' | ...

// Student authorization
if (classType === 'ignite') {
  // Check demo_batch_enrollments WHERE batch_id = liveClass.ignite_batch_id
} else {
  // Check enrollments (course) or mentor_groups (legacy)
}
```

---

## 6. Files to Modify (Summary)

### Phase 0 (Emergency)
| File | Change |
|------|--------|
| `lib/db/src/schema/demoSessions.ts` | Add `liveKitRoomName` column |
| `artifacts/api-server/src/routes/livekit.ts` | Add demo_sessions fallback lookup + Ignite auth |
| `artifacts/api-server/src/socket.ts` | `getLiveKitRoomName()` fallback to demo_sessions |

### Phase 1 (Schema extension)
| File | Change |
|------|--------|
| `lib/db/src/schema/liveClasses.ts` | Add `classType`, `igniteBatchId` columns |

### Phase 2 (Data migration)
| Files | Change |
|-------|--------|
| New migration script | `scripts/src/migrate-demo-sessions.ts` |
| `lib/db/src/schema/demoSessions.ts` | Mark as deprecated |

### Phase 3 (Consolidation)
| File | Change |
|------|--------|
| `artifacts/api-server/src/routes/livekit.ts` | Remove fallback, unified auth |
| `artifacts/api-server/src/routes/live.ts` | Remove fallback |
| `artifacts/api-server/src/routes/demoBatches.ts` | Dual-write: demo_sessions + live_classes |
| `artifacts/api-server/src/routes/teacher.ts` | Query live_classes only |
| `artifacts/api-server/src/routes/ignite.ts` | Target live_classes for class operations |
| `artifacts/api-server/src/socket.ts` | Simplified room resolver |
| `artifacts/braintam/src/hooks/use-livekit.ts` | Remove sessionType param |
| `artifacts/braintam/src/pages/live-classroom.tsx` | Remove type param detection |
| `artifacts/braintam/src/pages/teacher/index.tsx` | Remove ?type=ignite |

---

## 7. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| ID collision during Phase 2 migration | HIGH | Build and verify `demo_session_id_map` before remapping any FK |
| Old bookmarked URLs with `?type=ignite` break after Phase 3 | LOW | Keep backward-compatible: ignore `type` param, don't error on it |
| `demo_sessions` deleted too early | HIGH | Keep table, mark deprecated, enforce via code review |
| `livekit_room_name` UNIQUE constraint conflicts during INSERT | MEDIUM | Use `ON CONFLICT DO NOTHING` on that column in the migration INSERT |
| socket.ts caches room names in memory (`roomNameCache`) | LOW | Cache invalidation is already session-scoped; no issue |
| Phase 0 patch introduces its own ID collision in session_attendance | MEDIUM | Phase 0 is temporary; track as tech debt, resolve in Phase 2 |
| demo_batch_enrollments authorization different from mentor_groups | MEDIUM | Must implement in Phase 0 livekit.ts; verify enrollment table schema first |

---

## 8. Rollback Plan

### Phase 0 Rollback
- Revert `livekit.ts` and `socket.ts` to previous version (git)
- `ALTER TABLE demo_sessions DROP COLUMN livekit_room_name` (no data lost)
- Ignite classrooms revert to broken state (pre-fix)

### Phase 1 Rollback
- `ALTER TABLE live_classes DROP COLUMN class_type, DROP COLUMN ignite_batch_id`
- No data lost — columns are additive and not yet used by production writes

### Phase 2 Rollback
- `demo_sessions` rows are never deleted → source data always intact
- Re-run session_attendance / chat_messages / poll_analytics remapping with inverse mapping from `demo_session_id_map`
- Re-activate `demo_sessions` rows (set is_published = true)

### Phase 3 Rollback
- Revert frontend and route code via git
- Routes that read only `live_classes` revert to dual-table reads

---

## 9. Migration Phases Timeline

| Phase | Goal | Duration | Risk | Prerequisite |
|-------|------|----------|------|--------------|
| **Phase 0** | Fix Ignite LiveKit 404 in production | 1–2 hours | Low | None |
| **Phase 1** | Add class_type / ignite_batch_id to live_classes | 30 min | Very low | Phase 0 stable |
| **Phase 2** | Migrate demo_sessions data into live_classes | 2–4 hours | Medium | Phase 1, staging test first |
| **Phase 3** | Remove dual-table logic; unified routes | 4–8 hours | Low | Phase 2 verified stable |

---

## 10. Pre-Migration Checklist

Before starting Phase 0 on production:

- [ ] Verify `demo_batch_enrollments` schema — confirm column names for student-to-batch FK
- [ ] Count current `demo_sessions` rows: `SELECT COUNT(*) FROM demo_sessions`
- [ ] Count current `live_classes` rows: `SELECT COUNT(*) FROM live_classes`
- [ ] Confirm LiveKit credentials are set on VPS (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`)
- [ ] Take a full PostgreSQL dump before Phase 2: `pg_dump braintam > backup_pre_migration.dump`
- [ ] Test Phase 0 on staging/Replit before deploying to VPS
- [ ] Confirm PM2 can hot-reload after route changes without dropping active socket connections

---

## 11. One Thing Your Team Got Wrong (Minor)

The document says "livekit.ts searches ONLY `live_classes` using sessionId — if no record exists it returns 404." This is correct.

However, the document implies the fix requires a full architectural migration. **It does not.** Phase 0 (a small code patch + one nullable column) will fix production completely in hours. The architectural migration to unified `live_classes` is the right long-term direction, but it can be planned and executed without urgency once Ignite classrooms are working.

Do **not** rush Phase 2 (data migration). Get Phase 0 deployed, confirm Ignite LiveKit works end-to-end, then plan Phases 1–3 carefully.

---

*End of migration plan. No code has been changed. Awaiting approval before any modifications.*
