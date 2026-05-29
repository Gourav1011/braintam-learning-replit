import { db, usersTable, pointsLedgerTable } from "@workspace/db";
import type { PointsLedger } from "@workspace/db";
import { eq, sql, gt } from "drizzle-orm";

type ActionType = PointsLedger["actionType"];

interface AddPointsOptions {
  referenceId?:   number;
  referenceType?: string;
  note?:          string;
}

// ─── Point values per action ────────────────────────────────────────────────
const DAILY_LOGIN_POINTS   = 5;
const STREAK_BONUS_POINTS  = 20;
const STREAK_THRESHOLD     = 7;   // days before STREAK_BONUS triggers

// ────────────────────────────────────────────────────────────────────────────
// addPoints
// ────────────────────────────────────────────────────────────────────────────
/**
 * Records a point transaction in the ledger and updates the cached total on
 * the users row (the flat `points` column is kept as a denormalised cache so
 * leaderboard queries stay fast without needing a SUM every time).
 *
 * @returns the updated total points balance for this user
 */
export async function addPoints(
  userId:     number,
  amount:     number,
  actionType: ActionType,
  opts:       AddPointsOptions = {},
): Promise<number> {
  // 1. Write ledger entry
  await db.insert(pointsLedgerTable).values({
    userId,
    amount,
    actionType,
    referenceId:   opts.referenceId   ?? null,
    referenceType: opts.referenceType ?? null,
    note:          opts.note          ?? null,
  });

  // 2. Recompute balance from ledger (single SQL expression — always consistent)
  const [result] = await db
    .select({ balance: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(pointsLedgerTable)
    .where(eq(pointsLedgerTable.userId, userId));

  const newBalance = Number(result?.balance ?? 0);

  // 3. Sync denormalised cache on users row
  await db
    .update(usersTable)
    .set({ points: newBalance, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  // 4. Recalculate rank — count how many students have strictly more points
  const [above] = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(usersTable)
    .where(gt(usersTable.points, newBalance));
  const newRank = Number(above?.cnt ?? 0) + 1;
  await db.update(usersTable).set({ rank: newRank }).where(eq(usersTable.id, userId));

  return newBalance;
}

// ────────────────────────────────────────────────────────────────────────────
// checkDailyLogin
// ────────────────────────────────────────────────────────────────────────────
export interface DailyLoginResult {
  /** Whether points were actually awarded this call (false = already claimed today) */
  claimed:      boolean;
  pointsAdded:  number;
  streakBonus:  boolean;
  streakDays:   number;
  totalPoints:  number;
}

/**
 * Checks whether the student has already logged in today.
 * - First login of the day → award LOGIN points, update streak, possibly award
 *   STREAK_BONUS if they've hit the threshold.
 * - Subsequent calls the same calendar day → no-op, returns claimed: false.
 *
 * Uses `users.lastLoginDate` as the single source of truth so the logic is
 * safe across timezones (all dates are compared in UTC).
 */
export async function checkDailyLogin(userId: number): Promise<DailyLoginResult> {
  const [user] = await db
    .select({
      points:        usersTable.points,
      streakDays:    usersTable.streakDays,
      lastLoginDate: usersTable.lastLoginDate,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) throw new Error(`User ${userId} not found`);

  const now       = new Date();
  const todayUTC  = toUTCDateString(now);
  const lastLogin = user.lastLoginDate ? toUTCDateString(user.lastLoginDate) : null;

  // Already claimed today — nothing to do
  if (lastLogin === todayUTC) {
    return {
      claimed:     false,
      pointsAdded: 0,
      streakBonus: false,
      streakDays:  user.streakDays,
      totalPoints: user.points,
    };
  }

  // ── Streak calculation ───────────────────────────────────────────────────
  const wasYesterday = lastLogin === toUTCDateString(subtractDays(now, 1));
  const newStreakDays = wasYesterday ? user.streakDays + 1 : 1;
  const triggerStreakBonus = newStreakDays % STREAK_THRESHOLD === 0;

  // ── Award LOGIN points ───────────────────────────────────────────────────
  let totalPoints = await addPoints(userId, DAILY_LOGIN_POINTS, "LOGIN", {
    note: `Daily login — streak day ${newStreakDays}`,
  });

  // ── Award STREAK_BONUS if threshold reached ──────────────────────────────
  if (triggerStreakBonus) {
    totalPoints = await addPoints(userId, STREAK_BONUS_POINTS, "STREAK_BONUS", {
      note: `${newStreakDays}-day login streak bonus`,
    });
  }

  // ── Update lastLoginDate + streakDays on user row ────────────────────────
  await db
    .update(usersTable)
    .set({
      lastLoginDate: now,
      streakDays:    newStreakDays,
      updatedAt:     now,
    })
    .where(eq(usersTable.id, userId));

  const pointsAdded = DAILY_LOGIN_POINTS + (triggerStreakBonus ? STREAK_BONUS_POINTS : 0);

  return {
    claimed:     true,
    pointsAdded,
    streakBonus: triggerStreakBonus,
    streakDays:  newStreakDays,
    totalPoints,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

/** Returns a YYYY-MM-DD string in UTC for consistent date comparison. */
function toUTCDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Returns a new Date that is `n` days before `d`. */
function subtractDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() - n);
  return copy;
}
