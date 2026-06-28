import { Router } from "express";
import { db } from "@workspace/db";
import {
  masteryStudentsTable,
  masteryDeploymentBatchesTable,
  masteryTimelineTable,
  masteryNotificationsTable,
  usersTable,
  mentorGroupsTable,
  groupStudentsTable,
  enrollmentsTable,
  coursesTable,
} from "@workspace/db";
import { eq, desc, and, isNull, inArray } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");
const allStaff  = requireRole("mentor", "sales_mentor", "academic_mentor", "admin", "super_admin", "teacher");

function makeBatchCode(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DEPLOY-${ymd}-${rnd}`;
}

// ── GET /api/admin/mastery/deployment/stats ───────────────────────────────────
router.get("/admin/mastery/deployment/stats", adminOnly, async (_req, res) => {
  const allStudents = await db
    .select({
      id:            masteryStudentsTable.id,
      masteryStatus: masteryStudentsTable.masteryStatus,
      mentorId:      masteryStudentsTable.mentorId,
      isNewAdmission: masteryStudentsTable.isNewAdmission,
    })
    .from(masteryStudentsTable);

  const activeMentors = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.role, "mentor"), eq(usersTable.isActive, true)));

  const stats = {
    newAdmissions:    allStudents.filter(s => s.isNewAdmission).length,
    unassignedStudents: allStudents.filter(s => !s.mentorId).length,
    activeMentors:    activeMentors.length,
    assignedStudents: allStudents.filter(s => !!s.mentorId).length,
    totalStudents:    allStudents.length,
  };

  res.json(stats);
});

// ── GET /api/admin/mastery/deployment/unassigned ──────────────────────────────
router.get("/admin/mastery/deployment/unassigned", adminOnly, async (req, res) => {
  const { grade } = req.query as { grade?: string };
  const conditions = [isNull(masteryStudentsTable.mentorId)];
  if (grade) {
    const g = parseInt(grade, 10);
    if (!isNaN(g)) conditions.push(eq(masteryStudentsTable.grade, g));
  }
  const rows = await db
    .select()
    .from(masteryStudentsTable)
    .where(and(...conditions))
    .orderBy(masteryStudentsTable.studentName);

  res.json(rows);
});

// ── GET /api/admin/mastery/deployment/mentors ─────────────────────────────────
router.get("/admin/mastery/deployment/mentors", adminOnly, async (_req, res) => {
  const mentors = await db
    .select({
      id:          usersTable.id,
      name:        usersTable.name,
      email:       usersTable.email,
      phone:       usersTable.phone,
      mentorType:  usersTable.mentorType,
    })
    .from(usersTable)
    .where(and(eq(usersTable.role, "mentor"), eq(usersTable.isActive, true)))
    .orderBy(usersTable.name);

  // Count students each mentor already has
  const allStudents = await db
    .select({ mentorId: masteryStudentsTable.mentorId })
    .from(masteryStudentsTable);

  const studentCounts = allStudents.reduce<Record<number, number>>((acc, s) => {
    if (s.mentorId) acc[s.mentorId] = (acc[s.mentorId] ?? 0) + 1;
    return acc;
  }, {});

  res.json(mentors.map(m => ({ ...m, currentStudents: studentCounts[m.id] ?? 0 })));
});

// ── GET /api/admin/mastery/deployment/batches ─────────────────────────────────
router.get("/admin/mastery/deployment/batches", adminOnly, async (_req, res) => {
  const rows = await db
    .select()
    .from(masteryDeploymentBatchesTable)
    .orderBy(desc(masteryDeploymentBatchesTable.createdAt));
  res.json(rows);
});

// ── POST /api/admin/mastery/deployment/deploy ─────────────────────────────────
// Body: { mentorAssignments, teacherId?, teacherName?, grade?, notes? }
router.post("/admin/mastery/deployment/deploy", adminOnly, async (req, res) => {
  const {
    mentorAssignments,
    teacherId,
    teacherName,
    grade,
    notes,
  } = req.body as {
    mentorAssignments: Array<{ mentorId: number; mentorName: string; studentIds: number[] }>;
    teacherId?: number;
    teacherName?: string;
    grade?: number;
    notes?: string;
  };

  if (!mentorAssignments || mentorAssignments.length === 0) {
    res.status(400).json({ error: "mentorAssignments is required" });
    return;
  }

  const admin = req.authUser!;
  const batchCode = makeBatchCode();
  const allStudentIds = mentorAssignments.flatMap(m => m.studentIds);
  const allMentorIds  = mentorAssignments.map(m => m.mentorId);

  // Create deployment batch record
  const [batch] = await db
    .insert(masteryDeploymentBatchesTable)
    .values({
      batchCode,
      grade:            grade ?? null,
      mentorIdsJson:    JSON.stringify(allMentorIds),
      studentIdsJson:   JSON.stringify(allStudentIds),
      distributionJson: JSON.stringify(mentorAssignments),
      totalStudents:    allStudentIds.length,
      totalMentors:     allMentorIds.length,
      deployedById:     admin.id,
      deployedByName:   admin.name ?? "Admin",
      notes:            notes ?? null,
      status:           "completed",
    })
    .returning();

  // Assign each group of students to their mentor
  for (const assignment of mentorAssignments) {
    if (assignment.studentIds.length === 0) continue;

    await db
      .update(masteryStudentsTable)
      .set({
        mentorId:          assignment.mentorId,
        mentorName:        assignment.mentorName,
        deploymentBatchId: batch.id,
        updatedAt:         new Date(),
      })
      .where(inArray(masteryStudentsTable.id, assignment.studentIds));

    // Log timeline for each assigned student
    for (const studentId of assignment.studentIds) {
      await db.insert(masteryTimelineTable).values([
        {
          masteryStudentId: studentId,
          eventType:  "mentor_assigned",
          eventLabel: `Mentor Assigned: ${assignment.mentorName}`,
          eventData:  JSON.stringify({ mentorId: assignment.mentorId, mentorName: assignment.mentorName, batchCode }),
          actorId:    admin.id,
          actorName:  admin.name ?? "Admin",
        },
        {
          masteryStudentId: studentId,
          eventType:  "deployment_batch_created",
          eventLabel: `Deployment Batch: ${batchCode}`,
          eventData:  JSON.stringify({ batchId: batch.id, batchCode }),
          actorId:    admin.id,
          actorName:  admin.name ?? "Admin",
        },
      ]);

      // Fire notification to mentor
      await db.insert(masteryNotificationsTable).values({
        mentorId:         assignment.mentorId,
        type:             "student_assigned",
        title:            "New Student Assigned",
        body:             `A new student has been assigned to you (Batch ${batchCode})`,
        masteryStudentId: studentId,
      }).catch(() => null);
    }
  }

  // ── Sprint 1: Unify mentor_groups — create one group per mentor in this mastery deployment ──
  // Fire-and-forget: non-critical; does not block the response
  Promise.all(
    mentorAssignments.map(async (assignment) => {
      if (assignment.studentIds.length === 0) return;
      try {
        const [mg] = await db.insert(mentorGroupsTable).values({
          batchId: batch.id,
          sessionId: null,
          mentorId: assignment.mentorId,
          mentorName: assignment.mentorName ?? "Mentor",
          groupName: `${batchCode} · ${assignment.mentorName ?? `Mentor ${assignment.mentorId}`}`,
          programType: "mastery",
        }).returning({ id: mentorGroupsTable.id });

        if (mg && assignment.studentIds.length > 0) {
          await db.insert(groupStudentsTable).values(
            assignment.studentIds.map(sid => ({
              mentorGroupId: mg.id,
              studentId: String(sid),
              studentName: `MasteryStudent-${sid}`,
              phone: null,
            }))
          ).onConflictDoNothing();
        }
      } catch { /* non-critical */ }
    })
  ).catch(() => {});

  // ── Auto-enroll in mastery course + activate student portal ──────────────────
  // Fire-and-forget: non-critical; does not block the response
  Promise.resolve().then(async () => {
    try {
      // Build grade→courseId lookup for mastery courses only
      const masteryCourses = await db.select({ id: coursesTable.id, grade: coursesTable.grade })
        .from(coursesTable)
        .where(eq(coursesTable.courseType, "mastery"));
      const courseByGrade = new Map<number, number>(
        masteryCourses.map(c => [c.grade ?? 0, c.id])
      );

      // Fetch student grades from masteryStudentsTable
      const students = await db.select({
        id: masteryStudentsTable.id,
        studentId: masteryStudentsTable.studentId,
        grade: masteryStudentsTable.grade,
      }).from(masteryStudentsTable)
        .where(inArray(masteryStudentsTable.id, allStudentIds));

      for (const s of students) {
        const sGrade = s.grade ?? grade;
        const courseId = sGrade ? courseByGrade.get(sGrade) : undefined;

        // 1. Enroll in mastery course (idempotent via unique constraint)
        if (courseId && s.studentId) {
          await db.insert(enrollmentsTable).values({
            studentId: s.studentId,
            courseId,
            enrollmentType: "mastery",
            enrolledBy: admin.id,
            academicYear: new Date().getFullYear().toString(),
          }).onConflictDoNothing();
        }

        // 2. Activate student portal (set accountType=paid_student)
        if (s.studentId) {
          await db.update(usersTable)
            .set({ accountType: "paid_student" })
            .where(eq(usersTable.id, s.studentId));
        }

        // 3. Log teacher assignment in timeline if teacherId provided
        if (teacherId && teacherName) {
          await db.insert(masteryTimelineTable).values({
            masteryStudentId: s.id,
            eventType:  "teacher_assigned",
            eventLabel: `Teacher Assigned: ${teacherName}`,
            eventData:  JSON.stringify({ teacherId, teacherName, batchCode }),
            actorId:    admin.id,
            actorName:  admin.name ?? "Admin",
          }).catch(() => null);
        }

        // 4. Log portal activation in timeline
        await db.insert(masteryTimelineTable).values({
          masteryStudentId: s.id,
          eventType:  "portal_activated",
          eventLabel: "Student Portal Activated",
          eventData:  JSON.stringify({ courseId: courseId ?? null, batchCode }),
          actorId:    admin.id,
          actorName:  admin.name ?? "Admin",
        }).catch(() => null);
      }
    } catch { /* non-critical */ }
  }).catch(() => {});

  res.json({ batchCode, batchId: batch.id, totalAssigned: allStudentIds.length });
});

export default router;
