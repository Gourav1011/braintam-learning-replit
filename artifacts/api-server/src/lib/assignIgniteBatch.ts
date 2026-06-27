/**
 * Assigns a newly paid Ignite student to the best available batch for their grade
 * and creates the corresponding enrollment record so they see their course immediately.
 *
 * Priority: 'upcoming' batch first, then 'active'. Falls back gracefully if no batch exists.
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
import { and, eq, or, asc, sql } from "drizzle-orm";

export async function assignIgniteBatchAndCourse(
  studentId: number,
  grade: number,
  ignitePaidStudentId: number,
): Promise<{ batchId: number | null; courseId: number | null }> {
  // ── 1. Find best available batch for this grade ──────────────────
  // Prefer 'upcoming' (starts soon) over 'active' (already running).
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
    .where(
      and(
        eq(demoBatchesTable.grade, grade),
        or(
          eq(demoBatchesTable.status, "upcoming"),
          eq(demoBatchesTable.status, "active"),
        ),
      ),
    )
    .orderBy(
      sql`CASE WHEN ${demoBatchesTable.status} = 'upcoming' THEN 0 ELSE 1 END`,
      asc(demoBatchesTable.createdAt),
    )
    .limit(1);

  let batchId: number | null = null;

  if (batch) {
    batchId = batch.id;

    // ── 2. Enroll in batch (skip if already enrolled) ────────────
    await db
      .insert(demoBatchEnrollmentsTable)
      .values({ batchId: batch.id, studentId, enrollmentStatus: "active" })
      .onConflictDoNothing();

    // ── 3. Update ignitePaidStudent with batch details ───────────
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

  // ── 4. Find permanent Ignite course for this grade ───────────────
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

    // ── 5. Create enrollment so student sees course immediately ──
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
