import { db } from "@workspace/db";
import { mentorStudentAssignmentsTable, usersTable } from "@workspace/db";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { logger } from "../lib/logger.js";

function getISTHourMinute(): { h: number; m: number; dateStr: string } {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const dateStr = ist.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
  return { h: ist.getHours(), m: ist.getMinutes(), dateStr };
}

let lastResetDate = "";

export async function runDailyQueueReset(): Promise<void> {
  try {
    // 1. Get all students currently assigned to active sales mentors, with their assignment date
    const rows = await db
      .select({
        studentId: mentorStudentAssignmentsTable.studentId,
        assignedAt: mentorStudentAssignmentsTable.assignedAt,
      })
      .from(mentorStudentAssignmentsTable)
      .innerJoin(
        usersTable,
        and(
          eq(usersTable.id, mentorStudentAssignmentsTable.mentorId),
          eq(usersTable.role, "mentor"),
          eq(usersTable.mentorType, "sales"),
          eq(usersTable.isActive, true),
        )
      )
      .where(eq(mentorStudentAssignmentsTable.isActive, true));

    const studentIds = [...new Set(rows.map(r => r.studentId))];
    if (studentIds.length === 0) {
      logger.info("Daily queue reset: no active sales leads found");
      return;
    }

    // 2. Identify non-active leads: assigned 2+ days ago AND lastCallAt IS NULL.
    //    lastCallAt is stamped on every call log (even without a formal follow-up form),
    //    so it is the most accurate signal for "mentor never called this lead at all".
    //    These must NOT be reset — they belong in the Non-Active bucket.
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);

    const oldStudentIds = rows
      .filter(r => new Date(r.assignedAt) < twoDaysAgo)
      .map(r => r.studentId);

    let nonActiveIds = new Set<number>();
    if (oldStudentIds.length > 0) {
      // Leads with lastCallAt set have been called at least once → not non-active
      const neverCalledRows = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(
          inArray(usersTable.id, oldStudentIds),
          isNull(usersTable.lastCallAt),
        ));
      nonActiveIds = new Set(neverCalledRows.map(r => r.id));
    }

    // 3. Statuses that reset to Pending each morning:
    //    - Busy / Call Back / Call Later: temporary daily-queue statuses
    //    - Call Connected / Picked: mentor spoke, needs to follow up again
    //    - Interested / Not Interested: call completed; re-queue for next-day follow-up
    //    NOT reset: Non-Active leads (excluded above), payment states, permanent outcomes
    const RESET_STATUSES = [
      "Busy",
      "Call Back", "Call Back Later", "Call Later",
      "Call Connected", "Picked",
      "Interested", "Not Interested",
    ];

    const resetIds = nonActiveIds.size > 0
      ? studentIds.filter(id => !nonActiveIds.has(id))
      : studentIds;

    if (resetIds.length === 0) {
      logger.info("Daily queue reset: nothing to reset (all leads are non-active)");
      return;
    }

    await db
      .update(usersTable)
      .set({ callStatus: "Pending", updatedAt: new Date() })
      .where(
        and(
          inArray(usersTable.id, resetIds),
          inArray(usersTable.callStatus, RESET_STATUSES),
        )
      );

    logger.info(
      {
        totalLeads: studentIds.length,
        resetCandidates: resetIds.length,
        nonActiveSkipped: nonActiveIds.size,
        resetStatuses: RESET_STATUSES,
      },
      "Daily queue reset complete (5 AM IST)",
    );
  } catch (err) {
    logger.error({ err }, "Daily queue reset job failed");
  }
}

export function scheduleDailyQueueReset(): void {
  const CHECK_INTERVAL_MS = 60_000; // check every minute

  const tick = async () => {
    const { h, m, dateStr } = getISTHourMinute();
    if (h === 5 && m === 0 && lastResetDate !== dateStr) {
      lastResetDate = dateStr;
      logger.info({ dateStr }, "Running 5 AM daily queue reset…");
      await runDailyQueueReset();
    }
  };

  setInterval(tick, CHECK_INTERVAL_MS);
  logger.info("Daily 5 AM queue reset job scheduled (checks every minute)");
}
