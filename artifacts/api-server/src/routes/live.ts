import { Router } from "express";
import { db } from "@workspace/db";
import {
  liveClassesTable,
  demoSessionsTable,
  demoBatchesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/live/:sessionId
//
// Supports both:
// 1. Mastery/course live classes from liveClassesTable
// 2. Ignite/demo sessions from demoSessionsTable
router.get("/live/:sessionId", async (req, res) => {
  const id = Number(req.params["sessionId"]);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid sessionId" });
    return;
  }

  try {
    // First check the normal Mastery/course live-class table.
    const [liveClass] = await db
      .select()
      .from(liveClassesTable)
      .where(eq(liveClassesTable.id, id))
      .limit(1);

    if (liveClass) {
      res.json({
        id: liveClass.id,
        title: liveClass.title,
        scheduledAt:
          liveClass.scheduledAt?.toISOString() ?? null,
        joinUrl: liveClass.joinUrl ?? null,
        grade: liveClass.grade ?? null,
        subjectId: liveClass.subjectId ?? null,
        courseId: liveClass.courseId ?? null,
        teacherId: liveClass.teacherId ?? null,
        teacher: liveClass.teacher ?? null,
        duration: liveClass.duration ?? 60,
        status: liveClass.status ?? null,
        slideUrl: liveClass.slideUrl ?? null,
        sessionType: "live_class",
      });

      return;
    }

    // If it is not a normal live class, check Ignite/demo sessions.
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
      .leftJoin(
        demoBatchesTable,
        eq(demoSessionsTable.batchId, demoBatchesTable.id)
      )
      .where(eq(demoSessionsTable.id, id))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({
        error: "Live class or demo session not found",
      });
      return;
    }

    const session = rows[0];

    res.json({
      id: session.id,
      title:
        session.title ??
        session.batchName ??
        `Session ${session.id}`,
      scheduledAt:
        session.scheduledAt?.toISOString() ?? null,
      joinUrl: session.joinUrl ?? null,
      grade: session.batchGrade ?? null,
      subject: session.batchSubject ?? null,
      batchId: session.batchId ?? null,
      sessionType: "demo_session",
    });
  } catch (err) {
    req.log.error(
      { err, sessionId: id },
      "Failed to fetch live session"
    );

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
