/**
 * Assigns a newly paid Ignite student to the best available batch for their grade
 * and creates the corresponding enrollment record so they see their course immediately.
 *
 * Safety rules:
 *  1. Monday 11:00 AM IST cutoff — after this point, skip 'active' batches and only
 *     route to the next 'upcoming' batch. Students who pay late on Sunday or Monday
 *     morning join the active batch; students who pay after 11 AM on Monday get the
 *     following week's batch.
 *  2. ensureThreeWeekPipeline — called before every assignment query. If fewer than
 *     3 'upcoming' batches exist for the grade, new rows are auto-inserted so the
 *     pipeline is never empty.
 *
 * Called after ignitePaidStudentsTable insert — idempotent via onConflictDoNothing.
 */

import { db } from "@workspace/db";
import {
  demoBatchesTable,
  demoBatchEnrollmentsTable,
  coursesTable,
  enrollmentsTable,
  ignitePaidStudentsTable,
} from "@workspace/db";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";

// ── IST helpers ───────────────────────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/** Current moment as an IST-adjusted Date (use UTC accessors to read IST values). */
function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/**
 * Returns true when we are on a Monday at or after 11:00 AM IST.
 * At this point the running batch's first session has already started,
 * so new students should be routed to the NEXT upcoming batch.
 */
function pastMondayCutoffIST(): boolean {
  const ist = nowIST();
  return ist.getUTCDay() === 1 && ist.getUTCHours() >= 11;
}

/** ISO week number for a given Date. */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Computes the next Monday (in UTC) after the given date.
 * If the given date IS a Monday, returns the Monday one week later.
 * Batch start time is set to 09:00 IST = 03:30 UTC.
 */
function nextMondayAfter(base: Date): Date {
  const dayOfWeek = base.getUTCDay(); // 0=Sun … 1=Mon … 6=Sat
  // Always advance at least one day so we never return the same Monday
  const daysToAdd = dayOfWeek === 1 ? 7 : (1 - dayOfWeek + 7) % 7 || 7;
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + daysToAdd);
  result.setUTCHours(3, 30, 0, 0); // 09:00 IST
  return result;
}

// ── Pipeline safety check ─────────────────────────────────────────────────────

export const PIPELINE_MIN = 3; // keep at least this many upcoming batches in the DB

/**
 * Guarantees that ≥ PIPELINE_MIN 'upcoming' batches exist for the given grade.
 * If the count falls below the threshold, new batches are auto-inserted by
 * advancing 7 days from the furthest existing batch (any status).
 *
 * Naming convention: "Braintam Ignite Grade {grade} — Batch {NNN}"
 * Batch code: IGN-GR{grade}-W{isoWeek}
 */
export async function ensureThreeWeekPipeline(grade: number): Promise<void> {
  // How many 'upcoming' batches already exist for this grade?
  const [{ upcomingCount }] = await db
    .select({ upcomingCount: sql<number>`count(*)::int` })
    .from(demoBatchesTable)
    .where(and(eq(demoBatchesTable.grade, grade), eq(demoBatchesTable.status, "upcoming")));

  const needed = PIPELINE_MIN - (upcomingCount ?? 0);
  if (needed <= 0) return;

  // Furthest existing batch for this grade (any status) — determines where to start adding
  const [furthest] = await db
    .select({ startDate: demoBatchesTable.startDate })
    .from(demoBatchesTable)
    .where(eq(demoBatchesTable.grade, grade))
    .orderBy(desc(demoBatchesTable.startDate))
    .limit(1);

  // Total batch count (for sequential naming: Batch 001, 002, …)
  const [{ totalCount }] = await db
    .select({ totalCount: sql<number>`count(*)::int` })
    .from(demoBatchesTable)
    .where(eq(demoBatchesTable.grade, grade));

  // Base date: day after the furthest batch, or next Monday from now if none exist
  const baseStart: Date = furthest?.startDate
    ? nextMondayAfter(furthest.startDate)
    : nextMondayAfter(nowIST());

  let batchSeq = (totalCount ?? 0) + 1;

  for (let i = 0; i < needed; i++) {
    const startDate = new Date(baseStart.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000); // Mon → Fri
    const weekNum = getISOWeek(startDate);
    const seq = String(batchSeq + i).padStart(3, "0");
    const batchCode = `IGN-GR${grade}-W${weekNum}`;
    const title = `Braintam Ignite Grade ${grade} — Batch ${seq}`;

    await db.insert(demoBatchesTable).values({
      title,
      grade,
      startDate,
      endDate,
      status: "upcoming",
      totalDays: 5,
      batchCode,
      weekNumber: weekNum,
      academicYear: "2026-27",
      subject: "All Subjects",
      isActive: true,
      isPublic: true,
    }).onConflictDoNothing();
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function assignIgniteBatchAndCourse(
  studentId: number,
  grade: number,
  ignitePaidStudentId: number,
): Promise<{ batchId: number | null; courseId: number | null }> {

  // ── 0. Guarantee pipeline has ≥ 3 upcoming batches before we query ──
  await ensureThreeWeekPipeline(grade);

  // ── 1. Monday 11 AM IST cutoff ─────────────────────────────────────
  // After this point, skip 'active' batches — route to next 'upcoming' only.
  const skipActive = pastMondayCutoffIST();

  const statusFilter = skipActive
    ? eq(demoBatchesTable.status, "upcoming")
    : or(
        eq(demoBatchesTable.status, "upcoming"),
        eq(demoBatchesTable.status, "active"),
      );

  // ── 2. Find best available batch for this grade ─────────────────────
  // 'upcoming' always wins over 'active'; within the same status, earliest startDate first.
  const [batch] = await db
    .select({
      id: demoBatchesTable.id,
      title: demoBatchesTable.title,
      startDate: demoBatchesTable.startDate,
      endDate: demoBatchesTable.endDate,
      teacherName: demoBatchesTable.teacherName,
      status: demoBatchesTable.status,
    })
    .from(demoBatchesTable)
    .where(and(eq(demoBatchesTable.grade, grade), statusFilter))
    .orderBy(
      sql`CASE WHEN ${demoBatchesTable.status} = 'upcoming' THEN 0 ELSE 1 END`,
      asc(demoBatchesTable.startDate),
    )
    .limit(1);

  let batchId: number | null = null;

  if (batch) {
    batchId = batch.id;

    // ── 3. Enroll in batch (skip if already enrolled) ───────────────
    await db
      .insert(demoBatchEnrollmentsTable)
      .values({ batchId: batch.id, studentId, enrollmentStatus: "active" })
      .onConflictDoNothing();

    // ── 4. Update ignitePaidStudent with batch details ──────────────
    await db
      .update(ignitePaidStudentsTable)
      .set({
        assignedBatchId: batch.id,
        batchName: batch.title ?? null,
        batchStartDate: batch.startDate ?? null,
        teacherName: batch.teacherName ?? null,
        assignmentStatus: "batch_assigned",
        updatedAt: new Date(),
      })
      .where(eq(ignitePaidStudentsTable.id, ignitePaidStudentId));
  }

  // ── 5. Find permanent Ignite course for this grade ─────────────────
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

    // ── 6. Create enrollment so student sees course immediately ──────
    await db
      .insert(enrollmentsTable)
      .values({
        studentId,
        courseId: igniteCourse.id,
        batchId: batchId ?? undefined,
        enrollmentType: "ignite",
      })
      .onConflictDoNothing();
  }

  return { batchId, courseId };
}
