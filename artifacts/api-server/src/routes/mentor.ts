import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  mentorStudentAssignmentsTable,
  mentorFollowUpsTable,
  homeworkSubmissionsTable,
  testSubmissionsTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";
import crypto from "crypto";

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw + "braintam_salt").digest("hex");
}

const router = Router();
const mentorAuth = requireRole("mentor", "admin");

// ── Dashboard summary ───────────────────────────────────────────────────
router.get("/mentor/dashboard", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;

  const assignments = await db
    .select({ studentId: mentorStudentAssignmentsTable.studentId })
    .from(mentorStudentAssignmentsTable)
    .where(
      and(
        eq(mentorStudentAssignmentsTable.mentorId, mentorId),
        eq(mentorStudentAssignmentsTable.isActive, true),
      ),
    );

  const studentIds = assignments.map((a) => a.studentId);
  const totalAssigned = studentIds.length;

  if (totalAssigned === 0) {
    res.json({
      totalAssigned: 0,
      activeToday: 0,
      needsAttention: 0,
      atRisk: 0,
      homeworkPending: 0,
      recentFollowUps: [],
    });
    return;
  }

  // Homework pending (submitted=0 for these students)
  const [hwPendingRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(homeworkSubmissionsTable)
    .where(
      and(
        inArray(homeworkSubmissionsTable.studentId, studentIds),
        eq(homeworkSubmissionsTable.status, "pending"),
      ),
    );

  // Recent follow-ups
  const recentFollowUps = await db
    .select({
      id: mentorFollowUpsTable.id,
      studentId: mentorFollowUpsTable.studentId,
      studentName: usersTable.name,
      noteType: mentorFollowUpsTable.noteType,
      note: mentorFollowUpsTable.note,
      createdAt: mentorFollowUpsTable.createdAt,
    })
    .from(mentorFollowUpsTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.studentId))
    .where(eq(mentorFollowUpsTable.mentorId, mentorId))
    .orderBy(desc(mentorFollowUpsTable.createdAt))
    .limit(5);

  res.json({
    totalAssigned,
    activeToday: Math.floor(totalAssigned * 0.6), // placeholder — would need last_login tracking
    needsAttention: Math.floor(totalAssigned * 0.25),
    atRisk: Math.floor(totalAssigned * 0.1),
    homeworkPending: Number(hwPendingRow?.count ?? 0),
    recentFollowUps,
  });
});

// ── My students ─────────────────────────────────────────────────────────
router.get("/mentor/students", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
  const offset = (page - 1) * limit;

  const assignments = await db
    .select({
      studentId: mentorStudentAssignmentsTable.studentId,
      assignedAt: mentorStudentAssignmentsTable.assignedAt,
    })
    .from(mentorStudentAssignmentsTable)
    .where(
      and(
        eq(mentorStudentAssignmentsTable.mentorId, mentorId),
        eq(mentorStudentAssignmentsTable.isActive, true),
      ),
    )
    .limit(limit)
    .offset(offset);

  if (assignments.length === 0) {
    res.json({ students: [], total: 0 });
    return;
  }

  const studentIds = assignments.map((a) => a.studentId);
  const assignedAtMap = Object.fromEntries(assignments.map((a) => [a.studentId, a.assignedAt]));

  const students = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      grade: usersTable.grade,
      school: usersTable.school,
      lastLoginDate: usersTable.lastLoginDate,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(inArray(usersTable.id, studentIds));

  // Compute per-student stats
  const hwCounts = await db
    .select({
      studentId: homeworkSubmissionsTable.studentId,
      total: sql<number>`count(*)`,
      pending: sql<number>`count(*) filter (where status = 'pending')`,
    })
    .from(homeworkSubmissionsTable)
    .where(inArray(homeworkSubmissionsTable.studentId, studentIds))
    .groupBy(homeworkSubmissionsTable.studentId);

  const testCounts = await db
    .select({
      studentId: testSubmissionsTable.studentId,
      total: sql<number>`count(*)`,
    })
    .from(testSubmissionsTable)
    .where(inArray(testSubmissionsTable.studentId, studentIds))
    .groupBy(testSubmissionsTable.studentId);

  const hwMap = Object.fromEntries(hwCounts.map((r) => [r.studentId, r]));
  const testMap = Object.fromEntries(testCounts.map((r) => [r.studentId, r]));

  const result = students.map((s) => {
    const hw = hwMap[s.id];
    const hwTotal = Number(hw?.total ?? 0);
    const hwPending = Number(hw?.pending ?? 0);
    const hwDone = hwTotal - hwPending;
    const hwPct = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : 100;

    const testTotal = Number(testMap[s.id]?.total ?? 0);

    // Health score (0–100)
    const daysSinceLogin = s.lastLoginDate
      ? Math.floor((Date.now() - new Date(s.lastLoginDate).getTime()) / 86400000)
      : 999;
    const loginScore = daysSinceLogin <= 1 ? 100 : daysSinceLogin <= 3 ? 80 : daysSinceLogin <= 7 ? 60 : 30;
    const healthScore = Math.round((hwPct * 0.5) + (loginScore * 0.3) + (testTotal > 0 ? 20 : 0));

    let riskLevel: "excellent" | "good" | "attention" | "at-risk";
    if (healthScore >= 90) riskLevel = "excellent";
    else if (healthScore >= 75) riskLevel = "good";
    else if (healthScore >= 50) riskLevel = "attention";
    else riskLevel = "at-risk";

    return {
      ...s,
      assignedAt: assignedAtMap[s.id],
      hwCompletion: hwPct,
      hwTotal,
      testCount: testTotal,
      healthScore,
      riskLevel,
      daysSinceLogin,
    };
  });

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mentorStudentAssignmentsTable)
    .where(
      and(
        eq(mentorStudentAssignmentsTable.mentorId, mentorId),
        eq(mentorStudentAssignmentsTable.isActive, true),
      ),
    );

  res.json({ students: result, total: Number(total) });
});

// ── Student detail for mentor ────────────────────────────────────────────
router.get("/mentor/students/:id", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentId = parseInt(String(req.params.id), 10);

  // Verify assignment
  const [assignment] = await db
    .select()
    .from(mentorStudentAssignmentsTable)
    .where(
      and(
        eq(mentorStudentAssignmentsTable.mentorId, mentorId),
        eq(mentorStudentAssignmentsTable.studentId, studentId),
        eq(mentorStudentAssignmentsTable.isActive, true),
      ),
    )
    .limit(1);

  // Admin can view any student
  if (!assignment && req.authUser!.role !== "admin") {
    res.status(403).json({ error: "Not your assigned student" });
    return;
  }

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, studentId))
    .limit(1);

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const hwSubs = await db
    .select()
    .from(homeworkSubmissionsTable)
    .where(eq(homeworkSubmissionsTable.studentId, studentId))
    .orderBy(desc(homeworkSubmissionsTable.submittedAt))
    .limit(10);

  const testSubs = await db
    .select()
    .from(testSubmissionsTable)
    .where(eq(testSubmissionsTable.studentId, studentId))
    .orderBy(desc(testSubmissionsTable.submittedAt))
    .limit(10);

  const followUps = await db
    .select()
    .from(mentorFollowUpsTable)
    .where(
      and(
        eq(mentorFollowUpsTable.mentorId, mentorId),
        eq(mentorFollowUpsTable.studentId, studentId),
      ),
    )
    .orderBy(desc(mentorFollowUpsTable.createdAt));

  res.json({ student, hwSubs, testSubs, followUps });
});

// ── Follow-ups ───────────────────────────────────────────────────────────
router.get("/mentor/follow-ups", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const rows = await db
    .select({
      id: mentorFollowUpsTable.id,
      studentId: mentorFollowUpsTable.studentId,
      studentName: usersTable.name,
      noteType: mentorFollowUpsTable.noteType,
      note: mentorFollowUpsTable.note,
      createdAt: mentorFollowUpsTable.createdAt,
    })
    .from(mentorFollowUpsTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.studentId))
    .where(eq(mentorFollowUpsTable.mentorId, mentorId))
    .orderBy(desc(mentorFollowUpsTable.createdAt))
    .limit(50);
  res.json(rows);
});

router.post("/mentor/follow-ups", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const { studentId, noteType, note } = req.body;
  if (!studentId || !note) {
    res.status(400).json({ error: "studentId and note are required" });
    return;
  }
  const [row] = await db
    .insert(mentorFollowUpsTable)
    .values({ mentorId, studentId: Number(studentId), noteType: noteType ?? "general", note })
    .returning();
  res.status(201).json(row);
});

router.delete("/mentor/follow-ups/:id", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const id = parseInt(String(req.params.id), 10);
  await db
    .delete(mentorFollowUpsTable)
    .where(and(eq(mentorFollowUpsTable.id, id), eq(mentorFollowUpsTable.mentorId, mentorId)));
  res.json({ ok: true });
});

// ── Admin: Mentor management ─────────────────────────────────────────────
const adminOnly = requireRole("admin");

// List all mentors
router.get("/admin/mentors", adminOnly, async (req, res) => {
  const mentors = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.role, "mentor"))
    .orderBy(desc(usersTable.createdAt));

  // Student count per mentor
  const counts = await db
    .select({
      mentorId: mentorStudentAssignmentsTable.mentorId,
      count: sql<number>`count(*)`,
    })
    .from(mentorStudentAssignmentsTable)
    .where(eq(mentorStudentAssignmentsTable.isActive, true))
    .groupBy(mentorStudentAssignmentsTable.mentorId);

  const countMap = Object.fromEntries(counts.map((c) => [c.mentorId, Number(c.count)]));

  res.json(mentors.map((m) => ({ ...m, studentCount: countMap[m.id] ?? 0 })));
});

// Create mentor
router.post("/admin/mentors", adminOnly, async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, and password are required" });
    return;
  }
  const passwordHash = hashPassword(password);

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const [mentor] = await db
    .insert(usersTable)
    .values({ name, email, phone: phone ?? null, role: "mentor", grade: 0, passwordHash, points: 0, streakDays: 0 })
    .returning();

  res.status(201).json({ id: mentor.id, name: mentor.name, email: mentor.email, phone: mentor.phone, isActive: mentor.isActive, createdAt: mentor.createdAt, studentCount: 0 });
});

// Toggle mentor active
router.patch("/admin/mentors/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { isActive, name, password, phone } = req.body;
  const updates: Record<string, unknown> = {};
  if (typeof isActive === "boolean") updates.isActive = isActive;
  if (name) updates.name = name;
  if (password) updates.passwordHash = hashPassword(password);
  if (phone !== undefined) updates.phone = phone || null;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  res.json(updated);
});

// Delete mentor
router.delete("/admin/mentors/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  // Remove assignments
  await db.delete(mentorStudentAssignmentsTable).where(eq(mentorStudentAssignmentsTable.mentorId, id));
  await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

// All active mentor-student assignments as a map (for admin users tab)
router.get("/admin/mentor-student-map", adminOnly, async (req, res) => {
  const rows = await db
    .select({
      studentId: mentorStudentAssignmentsTable.studentId,
      mentorId: usersTable.id,
      mentorName: usersTable.name,
      mentorPhone: usersTable.phone,
    })
    .from(mentorStudentAssignmentsTable)
    .innerJoin(usersTable, eq(usersTable.id, mentorStudentAssignmentsTable.mentorId))
    .where(eq(mentorStudentAssignmentsTable.isActive, true));
  res.json(rows);
});

// Bulk-assign all active students of a grade to a mentor
router.post("/admin/mentor-grade-assign", adminOnly, async (req, res) => {
  const { mentorId, grade } = req.body;
  if (!mentorId || grade === undefined || grade === null) {
    res.status(400).json({ error: "mentorId and grade required" });
    return;
  }
  const studentRows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true), eq(usersTable.grade, Number(grade))));

  if (studentRows.length === 0) {
    res.json({ assigned: 0 });
    return;
  }
  // Deactivate any existing assignment for these students, then insert new
  await db.update(mentorStudentAssignmentsTable)
    .set({ isActive: false })
    .where(inArray(mentorStudentAssignmentsTable.studentId, studentRows.map(s => s.id)));
  await db.insert(mentorStudentAssignmentsTable)
    .values(studentRows.map(s => ({ mentorId: Number(mentorId), studentId: s.id })));
  res.json({ assigned: studentRows.length });
});

// Get assignments for a mentor
router.get("/admin/mentors/:id/assignments", adminOnly, async (req, res) => {
  const mentorId = parseInt(String(req.params.id), 10);
  const rows = await db
    .select({
      id: mentorStudentAssignmentsTable.id,
      studentId: mentorStudentAssignmentsTable.studentId,
      studentName: usersTable.name,
      studentGrade: usersTable.grade,
      studentEmail: usersTable.email,
      assignedAt: mentorStudentAssignmentsTable.assignedAt,
      isActive: mentorStudentAssignmentsTable.isActive,
    })
    .from(mentorStudentAssignmentsTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorStudentAssignmentsTable.studentId))
    .where(eq(mentorStudentAssignmentsTable.mentorId, mentorId))
    .orderBy(desc(mentorStudentAssignmentsTable.assignedAt));
  res.json(rows);
});

// Assign student to mentor
router.post("/admin/mentor-assignments", adminOnly, async (req, res) => {
  const { mentorId, studentId } = req.body;
  if (!mentorId || !studentId) {
    res.status(400).json({ error: "mentorId and studentId required" });
    return;
  }
  // Deactivate any existing assignment for this student
  await db
    .update(mentorStudentAssignmentsTable)
    .set({ isActive: false })
    .where(eq(mentorStudentAssignmentsTable.studentId, Number(studentId)));

  const [row] = await db
    .insert(mentorStudentAssignmentsTable)
    .values({ mentorId: Number(mentorId), studentId: Number(studentId) })
    .returning();
  res.status(201).json(row);
});

// Remove assignment
router.delete("/admin/mentor-assignments/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.update(mentorStudentAssignmentsTable).set({ isActive: false }).where(eq(mentorStudentAssignmentsTable.id, id));
  res.json({ ok: true });
});

export default router;
