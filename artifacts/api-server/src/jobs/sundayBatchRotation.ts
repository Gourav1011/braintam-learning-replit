/**
 * Sunday Batch Rotation Job — fires at 12:00 AM Monday IST (18:30 UTC Sunday).
 *
 * Cron Execution Sequence:
 *  1. Move the current 'active' dated batch to 'completed'.
 *  2. Promote the nearest valid 'upcoming' dated batch to 'active'.
 *  3. Run ensureThreeWeekPipeline to auto-generate missing upcoming slots.
 *  4. Run checkBatchPipelineHealth — logs a warning and re-repairs if unhealthy.
 *
 * Operates on ALL grades (1–10) in sequence.
 */

import { db } from "@workspace/db";
import { demoBatchesTable } from "@workspace/db";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import {
  ensureThreeWeekPipeline,
  checkBatchPipelineHealth,
} from "../lib/assignIgniteBatch.js";

const ALL_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function getISTDateTime(): { h: number; m: number; day: number; dateStr: string } {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return {
    h:       ist.getHours(),
    m:       ist.getMinutes(),
    day:     ist.getDay(),        // 0=Sun … 1=Mon … 6=Sat
    dateStr: ist.toLocaleDateString("en-CA"), // "YYYY-MM-DD"
  };
}

let lastRotationDate = "";

export async function runSundayBatchRotation(): Promise<void> {
  logger.info("Sunday batch rotation started");

  for (const grade of ALL_GRADES) {
    try {
      await rotateGrade(grade);
    } catch (err) {
      logger.error({ err, grade }, "Sunday rotation failed for grade");
    }
  }

  logger.info("Sunday batch rotation complete");
}

async function rotateGrade(grade: number): Promise<void> {
  const now = new Date();

  // ── 1. Complete the currently active batch ──────────────────────────
  const [activeBatch] = await db
    .select({ id: demoBatchesTable.id, title: demoBatchesTable.title })
    .from(demoBatchesTable)
    .where(
      and(
        eq(demoBatchesTable.grade, grade),
        eq(demoBatchesTable.status, "active"),
        isNotNull(demoBatchesTable.startDate),
        isNotNull(demoBatchesTable.endDate),
      ),
    )
    .limit(1);

  if (activeBatch) {
    await db
      .update(demoBatchesTable)
      .set({ status: "completed", isActive: false })
      .where(eq(demoBatchesTable.id, activeBatch.id));
    logger.info({ grade, batchId: activeBatch.id, title: activeBatch.title }, "Batch marked completed");
  }

  // ── 2. Promote nearest upcoming batch to active ─────────────────────
  const [nextBatch] = await db
    .select({ id: demoBatchesTable.id, title: demoBatchesTable.title })
    .from(demoBatchesTable)
    .where(
      and(
        eq(demoBatchesTable.grade, grade),
        eq(demoBatchesTable.status, "upcoming"),
        isNotNull(demoBatchesTable.startDate),
        isNotNull(demoBatchesTable.endDate),
      ),
    )
    .orderBy(asc(demoBatchesTable.startDate))
    .limit(1);

  if (nextBatch) {
    await db
      .update(demoBatchesTable)
      .set({ status: "active", isActive: true })
      .where(eq(demoBatchesTable.id, nextBatch.id));
    logger.info({ grade, batchId: nextBatch.id, title: nextBatch.title }, "Batch promoted to active");
  } else {
    logger.warn({ grade }, "No upcoming batch found during Sunday rotation — pipeline may be empty");
  }

  // ── 3. Refill pipeline ──────────────────────────────────────────────
  await ensureThreeWeekPipeline(grade);

  // ── 4. Health check ─────────────────────────────────────────────────
  await checkBatchPipelineHealth(grade);
}

export function scheduleSundayBatchRotation(): void {
  const CHECK_INTERVAL_MS = 60_000; // check every minute

  const tick = async () => {
    const { h, m, day, dateStr } = getISTDateTime();
    // 12:00 AM Monday IST = day===1, h===0, m===0
    if (day === 1 && h === 0 && m === 0 && lastRotationDate !== dateStr) {
      lastRotationDate = dateStr;
      logger.info({ dateStr }, "Running Sunday midnight batch rotation (12:00 AM Monday IST)…");
      try {
        await runSundayBatchRotation();
      } catch (err) {
        logger.error({ err }, "Sunday batch rotation job failed");
      }
    }
  };

  setInterval(tick, CHECK_INTERVAL_MS);
  logger.info("Sunday midnight batch rotation job scheduled (fires 12:00 AM Monday IST)");
}
