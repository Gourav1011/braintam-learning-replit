/**
 * Shared helper — called whenever a mastery student's payment is confirmed complete.
 * Handles: student activation, course auto-assignment, mentor notification,
 *           achievement ticker, timeline event, payment leaderboard update.
 *
 * Trigger conditions (per spec):
 *   A) Full Razorpay Payment Link paid (webhook payment_link.paid)
 *   B) Admin approval and total approved amount >= course fee
 */

import { db } from "@workspace/db";
import {
  masteryStudentsTable,
  masteryTimelineTable,
  masteryNotificationsTable,
  achievementTickersTable,
  coursesTable,
  enrollmentsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

interface PaymentCompleteOpts {
  masteryStudentId: number;
  actorId:    number;
  actorName:  string;
  amount:     number;
  eventSource: "payment_link" | "admin_approval";
}

export async function onMasteryPaymentComplete(opts: PaymentCompleteOpts): Promise<void> {
  const { masteryStudentId, actorId, actorName, amount, eventSource } = opts;

  // 1. Load student
  const [student] = await db
    .select()
    .from(masteryStudentsTable)
    .where(eq(masteryStudentsTable.id, masteryStudentId))
    .limit(1);
  if (!student) return;

  // Idempotency — already active from this path
  if (student.masteryStatus === "Active" && student.paymentCompletedAt) return;

  // 2. Activate student
  await db
    .update(masteryStudentsTable)
    .set({
      masteryStatus:       "Active",
      paymentCompletedAt:  new Date(),
      isNewAdmission:      false,
      updatedAt:           new Date(),
    })
    .where(eq(masteryStudentsTable.id, masteryStudentId));

  // 3. Auto-assign mastery course by grade (find first mastery course for this grade)
  let assignedCourseId: number | null = null;
  if (student.grade) {
    const [course] = await db
      .select({ id: coursesTable.id, title: coursesTable.title })
      .from(coursesTable)
      .where(
        and(
          eq(coursesTable.grade, student.grade),
          eq(coursesTable.courseType, "mastery"),
        )
      )
      .limit(1);

    if (course) {
      assignedCourseId = course.id;

      // Update student with assigned course
      await db
        .update(masteryStudentsTable)
        .set({ assignedCourseId: course.id })
        .where(eq(masteryStudentsTable.id, masteryStudentId));

      // Enroll student (if they have a linked studentId)
      if (student.studentId) {
        await db
          .insert(enrollmentsTable)
          .values({ studentId: student.studentId, courseId: course.id })
          .onConflictDoNothing();
      }
    }
  }

  // 4. Timeline event
  await db.insert(masteryTimelineTable).values({
    masteryStudentId,
    eventType:  "payment_complete",
    eventLabel: `Payment Complete — ₹${amount.toLocaleString("en-IN")} — Student Activated`,
    eventData:  JSON.stringify({ amount, eventSource, assignedCourseId }),
    actorId,
    actorName,
  });

  // 5. Mentor notification (🔔) — only on successful payment
  if (student.mentorId) {
    await db
      .insert(masteryNotificationsTable)
      .values({
        mentorId:         student.mentorId,
        type:             "payment_approved",
        title:            "Successful Payment",
        body:             `${student.studentName} completed successful payment`,
        masteryStudentId,
        studentName:      student.studentName,
        amount,
      })
      .catch(() => null);

    // 6. Achievement ticker (🏆) — for mentor dashboard queue
    await db
      .insert(achievementTickersTable)
      .values({
        mentorId:         student.mentorId,
        mentorName:       student.mentorName ?? actorName,
        studentName:      student.studentName,
        masteryStudentId,
        amount,
        eventSource,
        isShown:          false,
      })
      .catch(() => null);
  }
}
