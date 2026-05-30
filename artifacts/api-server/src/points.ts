import { db } from "@workspace/db";
import {
  usersTable,
  testSubmissionsTable,
  homeworkSubmissionsTable,
  assignmentSubmissionsTable,
  pointsLedgerTable,
  dailyCoinClaimsTable,
} from "@workspace/db";
import { eq, count, sum, sql } from "drizzle-orm";

const TEST_BASE_POINTS = 10;
const TEST_SCORE_MULTIPLIER = 0.2;
const HOMEWORK_POINTS = 5;
const ASSIGNMENT_POINTS = 8;

/**
 * Recomputes a student's total points from ALL sources and persists the result.
 *
 * Sources:
 *   1. Activity points  — tests, homework, assignments (calculated from submission counts)
 *   2. Ledger points    — daily login + streak bonus (summed from pointsLedgerTable)
 *   3. Daily coin bonus — sum of all daily coin claims from dailyCoinClaimsTable
 *
 * Previously the function only counted activity points, which wiped out
 * login/streak/coin balances every time a student submitted work.
 */
export async function recomputeAndSavePoints(studentId: number): Promise<number> {
  // ── 1. Activity points ───────────────────────────────────────────────────
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

  // ── 2. Ledger points (login + streak bonuses) ────────────────────────────
  const [ledgerRow] = await db
    .select({ balance: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(pointsLedgerTable)
    .where(eq(pointsLedgerTable.userId, studentId));
  const ledgerPoints = Number(ledgerRow?.balance ?? 0);

  // ── 3. Daily coin bonus ──────────────────────────────────────────────────
  const [coinRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(coins), 0)` })
    .from(dailyCoinClaimsTable)
    .where(eq(dailyCoinClaimsTable.userId, studentId));
  const coinPoints = Number(coinRow?.total ?? 0);

  // ── Save consolidated total ──────────────────────────────────────────────
  const totalPoints = testPoints + hwPoints + asgnPoints + ledgerPoints + coinPoints;

  await db
    .update(usersTable)
    .set({ points: totalPoints, updatedAt: new Date() })
    .where(eq(usersTable.id, studentId));

  return totalPoints;
}
