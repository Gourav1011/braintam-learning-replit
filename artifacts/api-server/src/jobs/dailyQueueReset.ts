import { db } from "@workspace/db";
import { mentorStudentAssignmentsTable, usersTable } from "@workspace/db";
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
    // Get all students currently assigned to active sales mentors
    const rows = await db
      .select({ studentId: mentorStudentAssignmentsTable.studentId })
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

    // Only reset temporary follow-up buckets → Pending.
    // No Response, Switched Off, Wrong Number are intentionally NOT reset (permanent outcomes).
    const RESET_STATUSES = ["Busy", "Call Back Later", "Call Back", "Call Connected", "Picked"];

    await db
      .update(usersTable)
      .set({ callStatus: "Pending", updatedAt: new Date() })
      .where(
        and(
          inArray(usersTable.id, studentIds),
          inArray(usersTable.callStatus, RESET_STATUSES),
        )
      );

    logger.info(
      { studentCount: studentIds.length, resetStatuses: RESET_STATUSES },
      "Daily queue reset: Busy/Call Later/Completed → Pending (5 AM IST)",
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
