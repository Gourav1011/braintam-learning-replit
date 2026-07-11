import { db } from "@workspace/db";
import { liveClassesTable, demoSessionsTable } from "@workspace/db";
import { and, eq, gte, lt, lte, ne, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

/**
 * Auto-transitions live_classes.status and demo_sessions.status based on
 * scheduledAt/duration, so every portal (teacher/student/mentor) sees the
 * same "live" / "completed" state without a teacher manually clicking
 * Start/End. Manual PATCH endpoints still work and are respected — this
 * job only ever moves classes forward along upcoming → live → completed,
 * never backward, so a manual early-start or early-end is never undone.
 */
export async function runLiveClassStatusSync(): Promise<void> {
  try {
    const now = new Date();

    // upcoming/scheduled → live: scheduledAt has arrived but window hasn't ended
    const liveClassesStarted = await db
      .update(liveClassesTable)
      .set({ status: "live" })
      .where(and(
        or(eq(liveClassesTable.status, "upcoming"), eq(liveClassesTable.status, "scheduled")),
        lte(liveClassesTable.scheduledAt, now),
        sql`${liveClassesTable.scheduledAt} + (${liveClassesTable.duration} * interval '1 minute') > ${now}`,
      ))
      .returning({ id: liveClassesTable.id });

    // Only auto-complete classes still in "upcoming" state that have fully passed
    // (i.e. they were never manually started). "live" classes stay live until
    // the teacher manually ends them via the teacher portal.
    const liveClassesEnded = await db
      .update(liveClassesTable)
      .set({ status: "completed" })
      .where(and(
        eq(liveClassesTable.status, "upcoming"),
        sql`${liveClassesTable.scheduledAt} + (${liveClassesTable.duration} * interval '1 minute') <= ${now}`,
      ))
      .returning({ id: liveClassesTable.id });

    const demoSessionsStarted = await db
      .update(demoSessionsTable)
      .set({ status: "live" })
      .where(and(
        eq(demoSessionsTable.status, "scheduled"),
        lte(demoSessionsTable.scheduledAt, now),
        sql`${demoSessionsTable.scheduledAt} + (${demoSessionsTable.duration} * interval '1 minute') > ${now}`,
      ))
      .returning({ id: demoSessionsTable.id });

    const demoSessionsEnded = await db
      .update(demoSessionsTable)
      .set({ status: "completed" })
      .where(and(
        ne(demoSessionsTable.status, "completed"),
        sql`${demoSessionsTable.scheduledAt} + (${demoSessionsTable.duration} * interval '1 minute') <= ${now}`,
      ))
      .returning({ id: demoSessionsTable.id });

    if (
      liveClassesStarted.length || liveClassesEnded.length ||
      demoSessionsStarted.length || demoSessionsEnded.length
    ) {
      logger.info(
        {
          liveClassesStarted: liveClassesStarted.length,
          liveClassesEnded: liveClassesEnded.length,
          demoSessionsStarted: demoSessionsStarted.length,
          demoSessionsEnded: demoSessionsEnded.length,
        },
        "Live class status sync applied transitions",
      );
    }
  } catch (err) {
    logger.error({ err }, "Live class status sync job failed");
  }
}

export function scheduleLiveClassStatusSync(): void {
  const CHECK_INTERVAL_MS = 30_000; // check every 30s for snappy live/ended transitions

  runLiveClassStatusSync().catch(() => {});
  setInterval(() => { runLiveClassStatusSync().catch(() => {}); }, CHECK_INTERVAL_MS);
  logger.info("Live class status auto-sync job scheduled (checks every 30s)");
}
