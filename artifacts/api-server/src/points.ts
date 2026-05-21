import { db } from "@workspace/db";
import {
  usersTable,
  testSubmissionsTable,
  homeworkSubmissionsTable,
  assignmentSubmissionsTable,
} from "@workspace/db";
import { eq, count, sum } from "drizzle-orm";

const TEST_BASE_POINTS = 10;
const TEST_SCORE_MULTIPLIER = 0.2;
const HOMEWORK_POINTS = 5;
const ASSIGNMENT_POINTS = 8;

export async function recomputeAndSavePoints(studentId: number): Promise<number> {
  const [testRows] = await db
    .select({
      submissions: count(),
      totalScore: sum(testSubmissionsTable.score),
      totalMax: sum(testSubmissionsTable.maxScore),
    })
    .from(testSubmissionsTable)
    .where(eq(testSubmissionsTable.studentId, studentId));

  const testCount = Number(testRows?.submissions ?? 0);
  const totalScore = Number(testRows?.totalScore ?? 0);
  const totalMax = Number(testRows?.totalMax ?? 0);
  const avgPct = totalMax > 0 ? totalScore / totalMax : 0;
  const testPoints =
    testCount * TEST_BASE_POINTS +
    Math.floor(avgPct * 100 * TEST_SCORE_MULTIPLIER * testCount);

  const [hwRows] = await db
    .select({ submissions: count() })
    .from(homeworkSubmissionsTable)
    .where(eq(homeworkSubmissionsTable.studentId, studentId));
  const hwPoints = Number(hwRows?.submissions ?? 0) * HOMEWORK_POINTS;

  const [asgnRows] = await db
    .select({ submissions: count() })
    .from(assignmentSubmissionsTable)
    .where(eq(assignmentSubmissionsTable.studentId, studentId));
  const asgnPoints = Number(asgnRows?.submissions ?? 0) * ASSIGNMENT_POINTS;

  const totalPoints = testPoints + hwPoints + asgnPoints;

  await db
    .update(usersTable)
    .set({ points: totalPoints, updatedAt: new Date() })
    .where(eq(usersTable.id, studentId));

  return totalPoints;
}
