/**
 * Ignite Batch Assignment & Pipeline Engine
 *
 * Safety rules (in order of execution):
 *  0. Null-date filter — batches with NULL start_date or end_date are ALWAYS
 *     excluded from counts, auto-promotion, and assignment routing.
 *  1. ensureThreeWeekPipeline — run before every student assignment and after
 *     every cron tick. Targets the equilibrium: 1 active + 2 upcoming dated batches.
 *     - Auto-promotes the earliest upcoming batch to active when activeCount === 0
 *       and that batch's startDate ≤ today. (Maximum 1 active enforced.)
 *     - Auto-generates new upcoming rows (Mon–Fri, +7d increments) until upcomingCount === 2.
 *  2. Monday 11:00 AM IST cutoff — after this point, skip 'active' batches entirely
 *     and route new students to the next 'upcoming' batch only.
 *  3. checkBatchPipelineHealth — reusable health check. Warns and auto-repairs when
 *     activeCount ≠ 1 OR upcomingCount ≠ 2. Called at the end of every payment and cron tick.
 */

import { db } from "@workspace/db";
import {
  demoBatchesTable,
  demoBatchEnrollmentsTable,
  coursesTable,
  enrollmentsTable,
  ignitePaidStudentsTable,
} from "@workspace/db";
import { and, asc, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { logger } from "./logger.js";

// ── Constants ─────────────────────────────────────────────────────────────────

export const PIPELINE_ACTIVE_TARGET  = 1;
export const PIPELINE_UPCOMING_TARGET = 2;

// ── IST helpers ───────────────────────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/** Current moment shifted to IST; use .getUTC*() methods to read IST values. */
export function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/** Today at 00:00:00 in IST, expressed as a UTC Date. */
function todayIST(): Date {
  const ist = nowIST();
  ist.setUTCHours(0, 0, 0, 0);
  return ist;
}

/**
 * True when we are on a Monday at or after 11:00 AM IST.
 * New students paying after this point must skip any 'active' batch.
 */
export function pastMondayCutoffIST(): boolean {
  const ist = nowIST();
  return ist.getUTCDay() === 1 && ist.getUTCHours() >= 11;
}

/** ISO week number for a Date. */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Returns the next Monday (UTC) strictly after `base`.
 * If `base` is itself a Monday, returns the Monday one week later.
 * Batch start time: 09:00 IST = 03:30 UTC.
 */
export function nextMondayAfter(base: Date): Date {
  const dayOfWeek = base.getUTCDay();
  const daysToAdd = dayOfWeek === 1 ? 7 : (1 - dayOfWeek + 7) % 7 || 7;
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + daysToAdd);
  result.setUTCHours(3, 30, 0, 0); // 09:00 IST
  return result;
}

// ── Health types ──────────────────────────────────────────────────────────────

export interface BatchPipelineHealth {
  grade: number;
  activeCount: number;
  upcomingCount: number;
  healthy: boolean;
  issues: string[];
}

// ── Core pipeline function ────────────────────────────────────────────────────

/**
 * Ensures the grade's batch pipeline is in equilibrium: 1 active + 2 upcoming.
 * Only considers DATED batches (startDate IS NOT NULL AND endDate IS NOT NULL).
 *
 * Returns the final active/upcoming counts after all repairs.
 */
export async function ensureThreeWeekPipeline(
  grade: number,
): Promise<{ activeCount: number; upcomingCount: number }> {
  const today = todayIST();

  // ── Fetch all dated batches ordered by startDate ───────────────────
  const datedBatches = await db
    .select({
      id: demoBatchesTable.id,
      status: demoBatchesTable.status,
      startDate: demoBatchesTable.startDate,
      endDate: demoBatchesTable.endDate,
    })
    .from(demoBatchesTable)
    .where(
      and(
        eq(demoBatchesTable.grade, grade),
        isNotNull(demoBatchesTable.startDate),
        isNotNull(demoBatchesTable.endDate),
      ),
    )
    .orderBy(asc(demoBatchesTable.startDate));

  let activeBatches  = datedBatches.filter(b => b.status === "active");
  let upcomingBatches = datedBatches.filter(b => b.status === "upcoming");

  // ── Auto-promote when there is no active batch ─────────────────────
  // Pick the nearest upcoming whose startDate ≤ today and make it active.
  // Never promote more than one — preserve the max-1-active constraint.
  if (activeBatches.length === 0) {
    const toPromote = upcomingBatches.find(b => b.startDate! <= today);
    if (toPromote) {
      await db
        .update(demoBatchesTable)
        .set({ status: "active" })
        .where(eq(demoBatchesTable.id, toPromote.id));

      logger.info({ grade, batchId: toPromote.id }, "Auto-promoted upcoming→active batch");
      activeBatches  = [{ ...toPromote, status: "active" }];
      upcomingBatches = upcomingBatches.filter(b => b.id !== toPromote.id);
    }
  }

  let upcomingCount = upcomingBatches.length;
  const neededUpcoming = PIPELINE_UPCOMING_TARGET - upcomingCount;

  if (neededUpcoming > 0) {
    // Furthest dated batch (any status) → base for new Monday slots
    const furthest = datedBatches.at(-1); // already sorted ascending

    // Count all batches for sequential naming
    const [{ totalCount }] = await db
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(demoBatchesTable)
      .where(eq(demoBatchesTable.grade, grade));

    const baseStart = furthest?.startDate
      ? nextMondayAfter(furthest.startDate)
      : nextMondayAfter(nowIST());

    let seq = (totalCount ?? 0) + 1;

    for (let i = 0; i < neededUpcoming; i++) {
      const startDate = new Date(baseStart.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const endDate   = new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000);
      const weekNum   = getISOWeek(startDate);
      const seqStr    = String(seq + i).padStart(3, "0");

      await db
        .insert(demoBatchesTable)
        .values({
          title:        `Braintam Ignite Grade ${grade} — Batch ${seqStr}`,
          grade,
          startDate,
          endDate,
          status:       "upcoming",
          totalDays:    5,
          batchCode:    `IGN-GR${grade}-W${weekNum}`,
          weekNumber:   weekNum,
          academicYear: "2026-27",
          subject:      "All Subjects",
          isActive:     true,
          isPublic:     true,
        })
        .onConflictDoNothing();

      upcomingCount++;
    }

    logger.info({ grade, generated: neededUpcoming }, "Auto-generated upcoming Ignite batches");
  }

  return { activeCount: activeBatches.length, upcomingCount };
}

// ── Health check ──────────────────────────────────────────────────────────────

/**
 * Validates pipeline equilibrium for a grade.
 * If unhealthy, logs a warning and triggers a repair via ensureThreeWeekPipeline.
 * Call after every payment webhook, cron tick, and manual admin repair.
 */
export async function checkBatchPipelineHealth(
  grade: number,
): Promise<BatchPipelineHealth> {
  const today = todayIST();

  const [{ activeCount }] = await db
    .select({ activeCount: sql<number>`count(*)::int` })
    .from(demoBatchesTable)
    .where(
      and(
        eq(demoBatchesTable.grade, grade),
        eq(demoBatchesTable.status, "active"),
        isNotNull(demoBatchesTable.startDate),
        isNotNull(demoBatchesTable.endDate),
      ),
    );

  const [{ upcomingCount }] = await db
    .select({ upcomingCount: sql<number>`count(*)::int` })
    .from(demoBatchesTable)
    .where(
      and(
        eq(demoBatchesTable.grade, grade),
        eq(demoBatchesTable.status, "upcoming"),
        isNotNull(demoBatchesTable.startDate),
        isNotNull(demoBatchesTable.endDate),
      ),
    );

  const issues: string[] = [];
  if ((activeCount ?? 0) !== PIPELINE_ACTIVE_TARGET)  issues.push(`activeCount=${activeCount ?? 0} (expected ${PIPELINE_ACTIVE_TARGET})`);
  if ((upcomingCount ?? 0) !== PIPELINE_UPCOMING_TARGET) issues.push(`upcomingCount=${upcomingCount ?? 0} (expected ${PIPELINE_UPCOMING_TARGET})`);

  const healthy = issues.length === 0;

  if (!healthy) {
    logger.warn(
      { grade, activeCount, upcomingCount, issues },
      `Grade ${grade} batch pipeline unhealthy. Auto-repair attempted.`,
    );
    // Trigger auto-repair — re-runs promotion + generation logic
    await ensureThreeWeekPipeline(grade);
  }

  void today; // suppress unused-var lint (today used conceptually for context)

  return {
    grade,
    activeCount:   activeCount  ?? 0,
    upcomingCount: upcomingCount ?? 0,
    healthy,
    issues,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function assignIgniteBatchAndCourse(
  studentId: number,
  grade: number,
  ignitePaidStudentId: number,
): Promise<{ batchId: number | null; courseId: number | null }> {

  // ── 0. Run pipeline repair before querying ────────────────────────
  await ensureThreeWeekPipeline(grade);

  // ── 1. Monday 11 AM IST cutoff ────────────────────────────────────
  const skipActive = pastMondayCutoffIST();

  const datedFilter = and(
    isNotNull(demoBatchesTable.startDate),
    isNotNull(demoBatchesTable.endDate),
  );

  const statusFilter = skipActive
    ? eq(demoBatchesTable.status, "upcoming")
    : or(
        eq(demoBatchesTable.status, "upcoming"),
        eq(demoBatchesTable.status, "active"),
      );

  // ── 2. Find best available DATED batch for this grade ────────────
  const [batch] = await db
    .select({
      id:          demoBatchesTable.id,
      title:       demoBatchesTable.title,
      startDate:   demoBatchesTable.startDate,
      endDate:     demoBatchesTable.endDate,
      teacherName: demoBatchesTable.teacherName,
      status:      demoBatchesTable.status,
    })
    .from(demoBatchesTable)
    .where(and(eq(demoBatchesTable.grade, grade), datedFilter, statusFilter))
    .orderBy(
      sql`CASE WHEN ${demoBatchesTable.status} = 'upcoming' THEN 0 ELSE 1 END`,
      asc(demoBatchesTable.startDate),
    )
    .limit(1);

  let batchId: number | null = null;

  if (batch) {
    batchId = batch.id;

    // ── 3. Enroll in batch ──────────────────────────────────────────
    await db
      .insert(demoBatchEnrollmentsTable)
      .values({ batchId: batch.id, studentId, enrollmentStatus: "active" })
      .onConflictDoNothing();

    // ── 4. Update ignitePaidStudent with batch details ──────────────
    await db
      .update(ignitePaidStudentsTable)
      .set({
        assignedBatchId: batch.id,
        batchName:       batch.title ?? null,
        batchStartDate:  batch.startDate ?? null,
        teacherName:     batch.teacherName ?? null,
        assignmentStatus: "batch_assigned",
        updatedAt:       new Date(),
      })
      .where(eq(ignitePaidStudentsTable.id, ignitePaidStudentId));
  }

  // ── 5. Find permanent Ignite course for this grade ────────────────
  const [igniteCourse] = await db
    .select({ id: coursesTable.id })
    .from(coursesTable)
    .where(
      and(
        eq(coursesTable.grade, grade),
        eq(coursesTable.courseType, "ignite"),
        eq(coursesTable.isArchived, false),
      ),
    )
    .limit(1);

  let courseId: number | null = null;

  if (igniteCourse) {
    courseId = igniteCourse.id;

    // ── 6. Create enrollment ────────────────────────────────────────
    await db
      .insert(enrollmentsTable)
      .values({
        studentId,
        courseId:        igniteCourse.id,
        batchId:         batchId ?? undefined,
        enrollmentType:  "ignite",
      })
      .onConflictDoNothing();
  }

  // ── 7. Post-payment health check ──────────────────────────────────
  void checkBatchPipelineHealth(grade).catch(e =>
    logger.error({ err: e, grade }, "Post-payment health check failed"),
  );

  return { batchId, courseId };
}
