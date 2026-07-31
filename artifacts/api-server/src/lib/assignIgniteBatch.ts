/**
 * Ignite Batch Assignment
 *
 * Ignite V2:
 * - Existing/running batches are preserved.
 * - Future weekly batches use per-grade business week numbers.
 * - Example: Grade 4 • Week 1 / IGN-G4-W1.
 * - Batch creation is NOT triggered by student payment.
 * - Deployment/start workflow controls future batch lifecycle.
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

// ── IST helpers ───────────────────────────────────────────────────────────────

export const IGNITE_COURSE_NAME = "Ignite Booster Course";
export const IGNITE_COURSE_CODE = "IGNITE";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

export function pastMondayCutoffIST(): boolean {
  const ist = nowIST();
  return ist.getUTCDay() === 1 && ist.getUTCHours() >= 11;
}

export function nextMondayAfter(base: Date): Date {
  const dayOfWeek = base.getUTCDay();
  const daysToAdd = dayOfWeek === 1 ? 7 : (1 - dayOfWeek + 7) % 7 || 7;
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + daysToAdd);
  result.setUTCHours(3, 30, 0, 0);
  return result;
}

// ── Ignite V2 future batch naming ────────────────────────────────────────────

export function igniteBatchTitle(grade: number, weekNumber: number): string {
  return `Grade ${grade} • Week ${weekNumber}`;
}

export function igniteBatchCode(grade: number, weekNumber: number): string {
  return `IGN-G${grade}-W${weekNumber}`;
}

/**
 * Returns the next V2 business week number for one grade.
 *
 * IMPORTANT:
 * Legacy ISO week numbers such as W33 must NOT force the V2 sequence
 * to start at W34. Only batches already using the new IGN-Gx-Wy
 * convention participate in the V2 counter.
 *
 * Therefore every grade can independently begin with W1.
 */
export async function getNextIgniteWeekNumber(grade: number): Promise<number> {
  if (!Number.isInteger(grade) || grade < 1 || grade > 10) {
    throw new Error(`Invalid Ignite grade: ${grade}`);
  }

  const prefix = `IGN-G${grade}-W`;

  const rows = await db
    .select({
      batchCode: demoBatchesTable.batchCode,
      weekNumber: demoBatchesTable.weekNumber,
    })
    .from(demoBatchesTable)
    .where(eq(demoBatchesTable.grade, grade));

  let max = 0;

  for (const row of rows) {
    if (!row.batchCode?.startsWith(prefix)) continue;

    const suffix = row.batchCode.slice(prefix.length);
    const parsed = Number.parseInt(suffix, 10);

    if (Number.isInteger(parsed) && parsed > max) {
      max = parsed;
    }
  }

  return max + 1;
}

/**
 * Creates ONE future draft/upcoming batch for a grade using Ignite V2 naming.
 *
 * This helper does not touch any existing running batch.
 * It does not assign students or mentors.
 *
 * Go 2 will connect this helper to Deploy / Undo / Start.
 */
export async function createNextIgniteDraftBatch(
  grade: number,
  options?: {
    startDate?: Date;
    endDate?: Date;
    academicYear?: string;
  },
) {
  if (!Number.isInteger(grade) || grade < 1 || grade > 10) {
    throw new Error(`Invalid Ignite grade: ${grade}`);
  }

  const weekNumber = await getNextIgniteWeekNumber(grade);

  let startDate = options?.startDate;

  if (!startDate) {
    // V2 dates must be based ONLY on the V2 sequence.
    //
    // W1:
    //   Start from the next Monday relative to now.
    //   Legacy IGN-GR*-W32/W33/etc. dates are ignored.
    //
    // W2+:
    //   Start on the Monday after the previous V2 batch.
    const previousV2Code =
      weekNumber > 1 ? igniteBatchCode(grade, weekNumber - 1) : null;

    let previousV2StartDate: Date | null = null;

    if (previousV2Code) {
      const [previousV2] = await db
        .select({ startDate: demoBatchesTable.startDate })
        .from(demoBatchesTable)
        .where(and(
          eq(demoBatchesTable.grade, grade),
          eq(demoBatchesTable.batchCode, previousV2Code),
          isNotNull(demoBatchesTable.startDate),
        ))
        .limit(1);

      previousV2StartDate = previousV2?.startDate ?? null;
    }

    startDate = previousV2StartDate
      ? nextMondayAfter(previousV2StartDate)
      : nextMondayAfter(nowIST());
  }

  const endDate = options?.endDate ??
    new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000);

  const title = igniteBatchTitle(grade, weekNumber);
  const batchCode = igniteBatchCode(grade, weekNumber);

  const [existing] = await db
    .select({ id: demoBatchesTable.id })
    .from(demoBatchesTable)
    .where(eq(demoBatchesTable.batchCode, batchCode))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(demoBatchesTable)
    .values({
      title,
      grade,
      startDate,
      endDate,
      status: "upcoming",
      totalDays: 5,
      batchCode,
      weekNumber,
      academicYear: options?.academicYear ?? "2026-27",
      subject: "All Subjects",
      isActive: true,
      isPublic: true,
    })
    .returning();

  return created;
}

// ── Student assignment ────────────────────────────────────────────────────────

export async function assignIgniteBatchAndCourse(
  studentId: number,
  grade: number,
  ignitePaidStudentId: number,
): Promise<{ batchId: number | null; courseId: number | null }> {

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
    .where(and(
      eq(demoBatchesTable.grade, grade),
      datedFilter,
      statusFilter,
    ))
    .orderBy(
      sql`CASE WHEN ${demoBatchesTable.status} = 'upcoming' THEN 0 ELSE 1 END`,
      asc(demoBatchesTable.startDate),
    )
    .limit(1);

  let batchId: number | null = null;

  if (batch) {
    batchId = batch.id;

    await db
      .insert(demoBatchEnrollmentsTable)
      .values({
        batchId: batch.id,
        studentId,
        enrollmentStatus: "active",
      })
      .onConflictDoNothing();

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

  /*
   * Keep the existing grade-specific Ignite course lookup during Go 1.
   * We are NOT rewriting historical course relationships in this patch.
   *
   * Go 2/3 can consolidate the UI/business identity to the permanent
   * "Ignite Booster Course" without breaking existing enrollment FKs.
   */
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
