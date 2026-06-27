import { Router } from "express";
import { db } from "@workspace/db";
import {
  masteryStudentsTable,
  masteryTimelineTable,
  studentAcademicHistoryTable,
  masteryNotificationsTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOnly  = requireRole("admin", "super_admin");
const allStaff   = requireRole("mentor", "admin", "super_admin", "teacher");

// ── GET /api/admin/mastery/retention ─────────────────────────────────────────
router.get("/admin/mastery/retention", adminOnly, async (req, res) => {
  const { retentionStatus, grade } = req.query as Record<string, string>;

  const rows = await db
    .select()
    .from(masteryStudentsTable)
    .where(
      inArray(masteryStudentsTable.masteryStatus, [
        "Retention Due", "Contacted", "Interested", "Follow-up",
        "Not Interested", "Renewed", "Lost",
      ])
    )
    .orderBy(masteryStudentsTable.studentName);

  let filtered = rows;
  if (retentionStatus && retentionStatus !== "all") {
    filtered = filtered.filter(r =>
      retentionStatus === "Retention Due"
        ? r.masteryStatus === "Retention Due"
        : r.retentionStatus === retentionStatus
    );
  }
  if (grade) {
    const g = parseInt(grade, 10);
    if (!isNaN(g)) filtered = filtered.filter(r => r.grade === g);
  }

  const stats = {
    retentionDue:   rows.filter(r => r.masteryStatus === "Retention Due" && !r.retentionStatus).length,
    contacted:      rows.filter(r => r.retentionStatus === "Contacted").length,
    interested:     rows.filter(r => r.retentionStatus === "Interested").length,
    followUp:       rows.filter(r => r.retentionStatus === "Follow-up").length,
    renewed:        rows.filter(r => r.retentionStatus === "Renewed" || r.masteryStatus === "Renewed").length,
    lost:           rows.filter(r => r.retentionStatus === "Lost").length,
  };

  res.json({ students: filtered, stats });
});

// ── GET /api/admin/mastery/retention/leaderboard ──────────────────────────────
router.get("/admin/mastery/retention/leaderboard", adminOnly, async (_req, res) => {
  const mentors = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(and(eq(usersTable.role, "mentor"), eq(usersTable.isActive, true)));

  const allStudents = await db
    .select({
      mentorId:       masteryStudentsTable.mentorId,
      mentorName:     masteryStudentsTable.mentorName,
      masteryStatus:  masteryStudentsTable.masteryStatus,
      retentionStatus: masteryStudentsTable.retentionStatus,
    })
    .from(masteryStudentsTable);

  const leaderboard = mentors.map(m => {
    const myStudents = allStudents.filter(s => s.mentorId === m.id);
    const retentionDue = myStudents.filter(s =>
      s.masteryStatus === "Retention Due" ||
      ["Contacted","Interested","Follow-up","Renewed","Lost","Not Interested"].includes(s.retentionStatus ?? "")
    ).length;
    const renewed = myStudents.filter(s =>
      s.retentionStatus === "Renewed" || s.masteryStatus === "Renewed"
    ).length;
    const pct = retentionDue > 0 ? Math.round((renewed / retentionDue) * 100) : 0;
    return {
      mentorId:    m.id,
      mentorName:  m.name,
      totalStudents:  myStudents.length,
      retentionDue,
      renewed,
      retentionPct: pct,
    };
  })
  .filter(m => m.retentionDue > 0)
  .sort((a, b) => b.retentionPct - a.retentionPct)
  .map((m, i) => ({ ...m, rank: i + 1 }));

  res.json(leaderboard);
});

// ── PATCH /api/admin/mastery/retention/:id/status ────────────────────────────
router.patch("/admin/mastery/retention/:id/status", adminOnly, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { retentionStatus, notes, followupAt } = req.body as {
    retentionStatus?: string;
    notes?: string;
    followupAt?: string;
  };

  const admin = req.authUser!;
  type StudentUpdate = {
    updatedAt?: Date;
    retentionStatus?: string | null;
    retentionContactedAt?: Date | null;
    retentionFollowupAt?: Date | null;
    retentionNotes?: string | null;
  };
  const setData: StudentUpdate = { updatedAt: new Date() };
  if (retentionStatus) {
    setData.retentionStatus = retentionStatus;
    if (retentionStatus === "Contacted") setData.retentionContactedAt = new Date();
    if (retentionStatus === "Follow-up" && followupAt) setData.retentionFollowupAt = new Date(followupAt + (followupAt.includes("+") ? "" : ":00+05:30"));
  }
  if (notes !== undefined) setData.retentionNotes = notes;

  const [row] = await db
    .update(masteryStudentsTable)
    .set(setData)
    .where(eq(masteryStudentsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  if (retentionStatus) {
    await db.insert(masteryTimelineTable).values({
      masteryStudentId: id,
      eventType:  "retention_status_changed",
      eventLabel: `Retention Status: ${retentionStatus}`,
      eventData:  JSON.stringify({ retentionStatus, notes }),
      actorId:    admin.id,
      actorName:  admin.name ?? "Admin",
    });
  }

  res.json(row);
});

// ── POST /api/admin/mastery/retention/:id/renew ───────────────────────────────
router.post("/admin/mastery/retention/:id/renew", adminOnly, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db
    .select()
    .from(masteryStudentsTable)
    .where(eq(masteryStudentsTable.id, id))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const admin = req.authUser!;
  const newGrade = (existing.grade ?? 1) + 1;
  const currentYear = new Date().getFullYear();
  const newAcademicYear = `${currentYear}-${String(currentYear + 1).slice(2)}`;
  const {
    amountPaid,
    coursePlan,
    renewalNotes,
  } = req.body as { amountPaid?: number; coursePlan?: string; renewalNotes?: string };

  // Save academic history for the CURRENT year before promoting
  await db.insert(studentAcademicHistoryTable).values({
    masteryStudentId: id,
    studentName:      existing.studentName,
    academicYear:     existing.academicYear ?? `${currentYear - 1}-${String(currentYear).slice(2)}`,
    grade:            existing.grade,
    mentorId:         existing.mentorId ?? null,
    mentorName:       existing.mentorName ?? null,
    status:           "Renewed",
    promotionDate:    new Date(),
    amountPaid:       existing.amountPaid,
    coursePlan:       existing.coursePlan ?? null,
    notes:            renewalNotes ?? null,
  });

  // Promote student: grade+1, new academic year, status = Active, clear retention
  const [updated] = await db
    .update(masteryStudentsTable)
    .set({
      grade:           newGrade,
      academicYear:    newAcademicYear,
      masteryStatus:   "Active",
      retentionStatus: "Renewed",
      renewedAt:       new Date(),
      renewalDueDate:  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      promotedGrade:   newGrade,
      isNewAdmission:  false,
      ...(amountPaid !== undefined ? { amountPaid } : {}),
      ...(coursePlan ? { coursePlan } : {}),
      updatedAt:       new Date(),
    })
    .where(eq(masteryStudentsTable.id, id))
    .returning();

  // Timeline events
  await db.insert(masteryTimelineTable).values([
    {
      masteryStudentId: id,
      eventType:  "renewed",
      eventLabel: `Renewed — Promoted to Grade ${newGrade}`,
      eventData:  JSON.stringify({ previousGrade: existing.grade, newGrade, academicYear: newAcademicYear }),
      actorId:    admin.id,
      actorName:  admin.name ?? "Admin",
    },
    {
      masteryStudentId: id,
      eventType:  "academic_year_created",
      eventLabel: `New Academic Year: ${newAcademicYear}`,
      eventData:  JSON.stringify({ academicYear: newAcademicYear }),
      actorId:    admin.id,
      actorName:  admin.name ?? "Admin",
    },
  ]);

  // Notify mentor
  if (existing.mentorId) {
    await db.insert(masteryNotificationsTable).values({
      mentorId:         existing.mentorId,
      type:             "student_renewed",
      title:            "Student Renewed",
      body:             `${existing.studentName} has been renewed for Grade ${newGrade}`,
      masteryStudentId: id,
      studentName:      existing.studentName,
    }).catch(() => null);
  }

  res.json({ student: updated, newGrade, newAcademicYear });
});

// ── POST /api/admin/mastery/retention/:id/lost ────────────────────────────────
router.post("/admin/mastery/retention/:id/lost", adminOnly, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const admin = req.authUser!;
  const { reason } = req.body as { reason?: string };

  const [existing] = await db.select().from(masteryStudentsTable).where(eq(masteryStudentsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  // Save academic history as Lost
  await db.insert(studentAcademicHistoryTable).values({
    masteryStudentId: id,
    studentName:      existing.studentName,
    academicYear:     existing.academicYear ?? String(new Date().getFullYear()),
    grade:            existing.grade,
    mentorId:         existing.mentorId ?? null,
    mentorName:       existing.mentorName ?? null,
    status:           "Lost",
    promotionDate:    new Date(),
    notes:            reason ?? null,
  });

  const [updated] = await db
    .update(masteryStudentsTable)
    .set({
      retentionStatus: "Lost",
      masteryStatus:   "Lost",
      updatedAt:       new Date(),
    })
    .where(eq(masteryStudentsTable.id, id))
    .returning();

  await db.insert(masteryTimelineTable).values({
    masteryStudentId: id,
    eventType:  "retention_lost",
    eventLabel: "Marked as Lost",
    eventData:  JSON.stringify({ reason }),
    actorId:    admin.id,
    actorName:  admin.name ?? "Admin",
  });

  res.json(updated);
});

// ── GET /api/admin/mastery/retention/:id/history ─────────────────────────────
router.get("/admin/mastery/retention/:id/history", allStaff, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(studentAcademicHistoryTable)
    .where(eq(studentAcademicHistoryTable.masteryStudentId, id))
    .orderBy(desc(studentAcademicHistoryTable.createdAt));

  res.json(rows);
});

// ── GET /api/admin/mastery/academic-history ───────────────────────────────────
router.get("/admin/mastery/academic-history", adminOnly, async (req, res) => {
  const { masteryStudentId } = req.query as Record<string, string>;
  const rows = masteryStudentId
    ? await db.select().from(studentAcademicHistoryTable)
        .where(eq(studentAcademicHistoryTable.masteryStudentId, parseInt(masteryStudentId, 10)))
        .orderBy(desc(studentAcademicHistoryTable.createdAt))
    : await db.select().from(studentAcademicHistoryTable)
        .orderBy(desc(studentAcademicHistoryTable.createdAt))
        .limit(200);
  res.json(rows);
});

// ── POST /api/admin/mastery/retention/trigger-dec1 ───────────────────────────
// Manual trigger for Dec 1 retention flip (Active → Retention Due)
router.post("/admin/mastery/retention/trigger-dec1", adminOnly, async (req, res) => {
  const admin = req.authUser!;

  const activeStudents = await db
    .select({ id: masteryStudentsTable.id, studentName: masteryStudentsTable.studentName })
    .from(masteryStudentsTable)
    .where(eq(masteryStudentsTable.masteryStatus, "Active"));

  if (activeStudents.length === 0) {
    res.json({ message: "No active students to update", updated: 0 });
    return;
  }

  await db
    .update(masteryStudentsTable)
    .set({ masteryStatus: "Retention Due", updatedAt: new Date() })
    .where(eq(masteryStudentsTable.masteryStatus, "Active"));

  for (const s of activeStudents.slice(0, 100)) {
    await db.insert(masteryTimelineTable).values({
      masteryStudentId: s.id,
      eventType:  "retention_due",
      eventLabel: "Retention Due — Annual Review",
      actorId:    admin.id,
      actorName:  admin.name ?? "System",
    });
  }

  res.json({ message: "Retention triggered", updated: activeStudents.length });
});

export default router;
