import { db } from "@workspace/db";
import { mentorStudentAssignmentsTable, mentorFollowUpsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
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
    // 1. Get all students currently assigned to active sales mentors
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

    // 2. Identify non-active leads (assigned 2+ days ago, zero follow-up history).
    //    These must NOT be reset — they belong in the Non-Active bucket and should
    //    not bleed back into Pending Calls every morning.
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);

    const oldStudentIds = rows
      .filter(r => new Date(r.assignedAt) < twoDaysAgo)
      .map(r => r.studentId);

    const nonActiveIds = new Set<number>();
    if (oldStudentIds.length > 0) {
      // Any entry in mentorFollowUpsTable means the mentor engaged the lead
      const engagedRows = await db
        .select({ studentId: mentorFollowUpsTable.studentId })
        .from(mentorFollowUpsTable)
        .where(inArray(mentorFollowUpsTable.studentId, oldStudentIds));
      const engagedSet = new Set(engagedRows.map(r => r.studentId));
      // Non-active = old assignments with NO follow-up history at all
      for (const id of oldStudentIds) {
        if (!engagedSet.has(id)) nonActiveIds.add(id);
      }
    }

    // 3. Statuses that reset to Pending each morning:
    //    - Busy / Call Back / Call Later: temporary daily-queue statuses
    //    - Call Connected / Picked: mentor spoke but needs to follow up again
    //    - Interested / Not Interested: call completed; re-queue for next-day follow-up
    //    NOT reset: Non-Active (excluded above), Payment statuses, permanent outcomes
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
