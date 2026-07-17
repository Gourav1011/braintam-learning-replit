import { Router } from "express";
import { db } from "@workspace/db";
import { demoSessionsTable, demoBatchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/live/:sessionId — returns session metadata for the live classroom page
router.get("/live/:sessionId", async (req, res) => {
  const id = Number(req.params["sessionId"]);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid sessionId" });
    return;
  }

  try {
    const rows = await db
      .select({
        id: demoSessionsTable.id,
        title: demoSessionsTable.title,
        scheduledAt: demoSessionsTable.scheduledAt,
        joinUrl: demoSessionsTable.joinUrl,
        batchId: demoSessionsTable.batchId,
        batchName: demoBatchesTable.title,
        batchGrade: demoBatchesTable.grade,
        batchSubject: demoBatchesTable.subject,
      })
      .from(demoSessionsTable)
      .leftJoin(demoBatchesTable, eq(demoSessionsTable.batchId, demoBatchesTable.id))
      .where(eq(demoSessionsTable.id, id))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const s = rows[0];
    res.json({
      id: s.id,
      title: s.title ?? s.batchName ?? `Session ${s.id}`,
      scheduledAt: s.scheduledAt?.toISOString() ?? null,
      joinUrl: s.joinUrl ?? null,
      grade: s.batchGrade ?? null,
      subject: s.batchSubject ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch live session");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
