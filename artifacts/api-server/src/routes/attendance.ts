import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, liveClassesTable, enrollmentsTable, usersTable, teacherCoursesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireRole, requireAuth } from "../middlewares/auth.js";

const router = Router();
const teacherOrAdmin = requireRole("teacher", "admin");

// ── Mark attendance for a live class ─────────────────────────
router.post("/teacher/live-classes/:id/attendance", teacherOrAdmin, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { records } = req.body as { records: { studentId: number; status: string; contacted?: boolean }[] };
  if (!records || !Array.isArray(records)) {
    res.status(400).json({ error: "records array is required" });
    return;
  }

  await db.delete(attendanceTable).where(eq(attendanceTable.liveClassId, classId));
  if (records.length > 0) {
    await db.insert(attendanceTable).values(
      records.map(r => ({
        liveClassId: classId,
        studentId: r.studentId,
        status: r.status ?? "present",
        present: (r.status ?? "present") === "present",
        contacted: r.contacted ?? false,
      }))
    );
  }
  res.json({ success: true, count: records.length });
});

// ── Patch a single student's contacted flag ───────────────────
router.patch("/teacher/live-classes/:id/attendance/:studentId/contacted", teacherOrAdmin, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  const studentId = parseInt(String(req.params.studentId), 10);
  if (isNaN(classId) || isNaN(studentId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { contacted } = req.body as { contacted: boolean };
  await db.update(attendanceTable)
    .set({ contacted: !!contacted })
    .where(and(eq(attendanceTable.liveClassId, classId), eq(attendanceTable.studentId, studentId)));
  res.json({ success: true });
});

// ── Get attendance for a live class ─────────────────────────
router.get("/teacher/live-classes/:id/attendance", teacherOrAdmin, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select({
      studentId: attendanceTable.studentId,
      studentName: usersTable.name,
      present: attendanceTable.present,
      status: attendanceTable.status,
      contacted: attendanceTable.contacted,
      markedAt: attendanceTable.markedAt,
    })
    .from(attendanceTable)
    .innerJoin(usersTable, eq(attendanceTable.studentId, usersTable.id))
    .where(eq(attendanceTable.liveClassId, classId));
  res.json(rows);
});

// ── Update live class status (start / end) ───────────────────
router.patch("/teacher/live-classes/:id/status", teacherOrAdmin, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { status } = req.body;
  if (!["upcoming", "live", "completed"].includes(status)) {
    res.status(400).json({ error: "status must be upcoming | live | completed" });
    return;
  }
  const [updated] = await db.update(liveClassesTable)
    .set({ status })
    .where(eq(liveClassesTable.id, classId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, scheduledAt: updated.scheduledAt.toISOString(), createdAt: updated.createdAt.toISOString() });
});

// ── Student: view own attendance ─────────────────────────────
router.get("/student/attendance", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  const rows = await db
    .select({
      liveClassId: attendanceTable.liveClassId,
      present: attendanceTable.present,
      status: attendanceTable.status,
      markedAt: attendanceTable.markedAt,
      classTitle: liveClassesTable.title,
      scheduledAt: liveClassesTable.scheduledAt,
    })
    .from(attendanceTable)
    .innerJoin(liveClassesTable, eq(attendanceTable.liveClassId, liveClassesTable.id))
    .where(eq(attendanceTable.studentId, studentId))
    .orderBy(liveClassesTable.scheduledAt);
  res.json(rows.map(r => ({
    ...r,
    scheduledAt: r.scheduledAt.toISOString(),
    markedAt: r.markedAt.toISOString(),
  })));
});

export default router;
