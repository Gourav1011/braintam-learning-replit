import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  auditLogsTable,
  teacherCoursesTable,
  liveClassesTable,
  coursesTable,
  courseSubjectsTable,
} from "@workspace/db";
import { requireRole } from "../middlewares/auth.js";
import {
  eq, and, desc, ilike, or, asc, count, isNotNull,
} from "drizzle-orm";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

function parseJsonArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// ── Audit helper ─────────────────────────────────────────────────────────────
async function logTeacherAction(opts: {
  actorId: number; actorName: string; actorRole: string;
  action: string; actionLabel: string;
  targetId: number; targetName: string;
  beforeValue?: unknown; afterValue?: unknown;
}) {
  try {
    await db.insert(auditLogsTable).values({
      actorId: opts.actorId, actorName: opts.actorName, actorRole: opts.actorRole,
      action: opts.action, actionLabel: opts.actionLabel,
      category: "staff", module: "teacher",
      targetType: "user", targetId: opts.targetId, targetName: opts.targetName,
      beforeValue: opts.beforeValue ?? null, afterValue: opts.afterValue ?? null,
    });
  } catch (_) { /* non-fatal */ }
}

// ── Teacher List + KPIs ───────────────────────────────────────────────────────
router.get("/admin/cc/teachers", adminOnly, async (req, res) => {
  try {
    const {
      search = "", department = "all", status = "all",
      sort = "name", order = "asc", page = "1", limit = "15",
    } = req.query as Record<string, string>;

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const offset   = (pageNum - 1) * pageSize;

    const conditions = [eq(usersTable.role, "teacher")];

    if (search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(or(ilike(usersTable.name, q), ilike(usersTable.email, q), ilike(usersTable.phone, q))!);
    }
    if (department !== "all") conditions.push(eq(usersTable.department, department));
    if (status === "active")   conditions.push(eq(usersTable.isActive, true));
    if (status === "inactive") conditions.push(eq(usersTable.isActive, false));

    const where = and(...conditions);

    const sortCol =
      sort === "createdAt"   ? usersTable.createdAt :
      sort === "lastActive"  ? usersTable.lastLoginDate :
      usersTable.name;
    const orderFn = order === "desc" ? desc : asc;

    const [teachers, [{ total }], allTeacherRows, courseCountsRaw, classCountsRaw] = await Promise.all([
      db.select({
        id: usersTable.id, name: usersTable.name, email: usersTable.email,
        phone: usersTable.phone, role: usersTable.role,
        department: usersTable.department, isActive: usersTable.isActive,
        avatarUrl: usersTable.avatarUrl, createdAt: usersTable.createdAt,
        lastLoginDate: usersTable.lastLoginDate,
        employeeId: usersTable.employeeId, qualification: usersTable.qualification,
        experienceYears: usersTable.experienceYears,
        teachingSubjectsJson: usersTable.teachingSubjectsJson,
        teachingGradesJson: usersTable.teachingGradesJson,
        joiningDate: usersTable.joiningDate,
      }).from(usersTable).where(where)
        .orderBy(orderFn(sortCol as any)).limit(pageSize).offset(offset),

      db.select({ total: count() }).from(usersTable).where(where),

      // Unfiltered — for KPIs
      db.select({ id: usersTable.id, isActive: usersTable.isActive })
        .from(usersTable).where(eq(usersTable.role, "teacher")),

      // Course counts per teacher
      db.select({ teacherId: teacherCoursesTable.teacherId, cnt: count() })
        .from(teacherCoursesTable).groupBy(teacherCoursesTable.teacherId),

      // Live class counts per teacher
      db.select({ teacherId: liveClassesTable.teacherId, cnt: count() })
        .from(liveClassesTable).where(isNotNull(liveClassesTable.teacherId))
        .groupBy(liveClassesTable.teacherId),
    ]);

    const courseMap = new Map(courseCountsRaw.map(r => [r.teacherId, r.cnt]));
    const classMap  = new Map(classCountsRaw.map(r => [r.teacherId!, r.cnt]));

    const items = teachers.map(t => ({
      ...t,
      coursesCount: courseMap.get(t.id) ?? 0,
      classesCount: classMap.get(t.id) ?? 0,
      teachingSubjects: parseJsonArray(t.teachingSubjectsJson),
      teachingGrades: parseJsonArray(t.teachingGradesJson),
    }));

    // JS sort for computed cols
    if (sort === "coursesCount") items.sort((a, b) => order === "desc" ? b.coursesCount - a.coursesCount : a.coursesCount - b.coursesCount);
    if (sort === "classesCount") items.sort((a, b) => order === "desc" ? b.classesCount - a.classesCount : a.classesCount - b.classesCount);

    // KPIs
    const totalTeachers    = allTeacherRows.length;
    const activeTeachers   = allTeacherRows.filter(t => t.isActive).length;
    const inactiveTeachers = allTeacherRows.filter(t => !t.isActive).length;
    const totalClasses     = [...classCountsRaw].reduce((s, r) => s + r.cnt, 0);
    const totalCourses     = [...courseCountsRaw].reduce((s, r) => s + r.cnt, 0);

    res.json({
      items, total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize),
      kpis: { totalTeachers, activeTeachers, inactiveTeachers, totalClasses, totalCourses, avgAttendance: 0 },
    });
  } catch (err) {
    req.log.error({ err }, "teacher list error");
    res.status(500).json({ error: "Failed to list teachers" });
  }
});

// ── Teacher Profile ───────────────────────────────────────────────────────────
router.get("/admin/cc/teachers/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [teacher] = await db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      phone: usersTable.phone, role: usersTable.role,
      department: usersTable.department, isActive: usersTable.isActive,
      avatarUrl: usersTable.avatarUrl, createdAt: usersTable.createdAt,
      lastLoginDate: usersTable.lastLoginDate, updatedAt: usersTable.updatedAt,
      employeeId: usersTable.employeeId, qualification: usersTable.qualification,
      experienceYears: usersTable.experienceYears,
      teachingSubjectsJson: usersTable.teachingSubjectsJson,
      teachingGradesJson: usersTable.teachingGradesJson,
      joiningDate: usersTable.joiningDate,
    }).from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.role, "teacher"))).limit(1);

    if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }

    // Subjects via teacher_courses → courses → course_subjects (name col)
    const subjectRows = await db
      .selectDistinct({ subjectName: courseSubjectsTable.name })
      .from(teacherCoursesTable)
      .innerJoin(coursesTable, eq(coursesTable.id, teacherCoursesTable.courseId))
      .innerJoin(courseSubjectsTable, eq(courseSubjectsTable.courseId, coursesTable.id))
      .where(eq(teacherCoursesTable.teacherId, id));

    // Course/subject assignments (Program → Course → Subject)
    const assignments = await db.select({
      id: teacherCoursesTable.id,
      courseId: teacherCoursesTable.courseId,
      courseTitle: coursesTable.title,
      courseType: coursesTable.courseType,
      grade: coursesTable.grade,
      courseSubjectId: teacherCoursesTable.courseSubjectId,
      subjectName: courseSubjectsTable.name,
      assignedAt: teacherCoursesTable.assignedAt,
    })
      .from(teacherCoursesTable)
      .innerJoin(coursesTable, eq(coursesTable.id, teacherCoursesTable.courseId))
      .leftJoin(courseSubjectsTable, eq(courseSubjectsTable.id, teacherCoursesTable.courseSubjectId))
      .where(eq(teacherCoursesTable.teacherId, id))
      .orderBy(desc(teacherCoursesTable.assignedAt));

    const upcomingClasses = await db.select({
      id: liveClassesTable.id, title: liveClassesTable.title,
      scheduledAt: liveClassesTable.scheduledAt, duration: liveClassesTable.duration,
      status: liveClassesTable.status, grade: liveClassesTable.grade,
    }).from(liveClassesTable)
      .where(and(eq(liveClassesTable.teacherId, id), eq(liveClassesTable.status, "upcoming")))
      .orderBy(asc(liveClassesTable.scheduledAt));

    const [{ classCnt }] = await db.select({ classCnt: count() }).from(liveClassesTable).where(eq(liveClassesTable.teacherId, id));

    const activity = await db.select({
      id: auditLogsTable.id, action: auditLogsTable.action, actionLabel: auditLogsTable.actionLabel,
      module: auditLogsTable.module, targetName: auditLogsTable.targetName, createdAt: auditLogsTable.createdAt,
    }).from(auditLogsTable).where(eq(auditLogsTable.actorId, id)).orderBy(desc(auditLogsTable.createdAt)).limit(10);

    const permissions = [
      { module: "Dashboard",      view: true,  create: false, edit: false,  del: false },
      { module: "My Classes",     view: true,  create: false, edit: true,   del: false },
      { module: "Homework",       view: true,  create: true,  edit: true,   del: true  },
      { module: "Assignments",    view: true,  create: true,  edit: true,   del: true  },
      { module: "Tests",          view: true,  create: true,  edit: true,   del: false },
      { module: "Attendance",     view: true,  create: true,  edit: false,  del: false },
      { module: "Students",       view: true,  create: false, edit: false,  del: false },
      { module: "Staff Mgmt",     view: false, create: false, edit: false,  del: false },
    ];

    res.json({
      profile: {
        ...teacher,
        teachingSubjects: parseJsonArray(teacher.teachingSubjectsJson),
        teachingGrades: parseJsonArray(teacher.teachingGradesJson),
      },
      performance: {
        classesAssigned: classCnt ?? 0,
        coursesAssigned: subjectRows.length,
        subjects: subjectRows.map(s => s.subjectName),
        attendancePct: 0,        // future hook
        homeworkCompletionPct: 0, // future hook
      },
      assignments,
      upcomingClasses,
      permissions,
      activity,
    });
  } catch (err) {
    req.log.error({ err }, "teacher profile error");
    res.status(500).json({ error: "Failed to load teacher profile" });
  }
});

// ── Teacher Classes ───────────────────────────────────────────────────────────
router.get("/admin/cc/teachers/:id/classes", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { page = "1", limit = "15" } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, parseInt(limit, 10) || 15);
  const offset   = (pageNum - 1) * pageSize;

  try {
    const [classes, [{ total }]] = await Promise.all([
      db.select({
        id: liveClassesTable.id, title: liveClassesTable.title,
        subjectId: liveClassesTable.subjectId, scheduledAt: liveClassesTable.scheduledAt,
        status: liveClassesTable.status, joinUrl: liveClassesTable.joinUrl,
        grade: liveClassesTable.grade,
      }).from(liveClassesTable).where(eq(liveClassesTable.teacherId, id))
        .orderBy(desc(liveClassesTable.scheduledAt)).limit(pageSize).offset(offset),
      db.select({ total: count() }).from(liveClassesTable).where(eq(liveClassesTable.teacherId, id)),
    ]);

    res.json({ items: classes, total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    req.log.error({ err }, "teacher classes error");
    res.status(500).json({ error: "Failed to load teacher classes" });
  }
});

// ── Create Teacher ────────────────────────────────────────────────────────────
router.post("/admin/cc/teachers", adminOnly, async (req, res) => {
  const {
    name, email, password, phone, department,
    employeeId, qualification, experienceYears, teachingSubjects, teachingGrades, joiningDate,
  } = req.body as {
    name?: string; email?: string; password?: string; phone?: string; department?: string;
    employeeId?: string; qualification?: string; experienceYears?: number;
    teachingSubjects?: string[]; teachingGrades?: number[]; joiningDate?: string;
  };

  if (!name?.trim())     { res.status(400).json({ error: "Name is required" });     return; }
  if (!email?.trim())    { res.status(400).json({ error: "Email is required" });    return; }
  if (!password?.trim()) { res.status(400).json({ error: "Password is required" }); return; }

  try {
    const existing = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
    if (existing.length > 0) { res.status(400).json({ error: "A user with this email already exists" }); return; }

    if (employeeId?.trim()) {
      const dupe = await db.select({ id: usersTable.id })
        .from(usersTable).where(eq(usersTable.employeeId, employeeId.trim())).limit(1);
      if (dupe.length > 0) { res.status(400).json({ error: "A teacher with this Employee ID already exists" }); return; }
    }

    const { createHash } = await import("crypto");
    const passwordHash = createHash("sha256").update(password.trim() + "braintam_salt").digest("hex");

    const [teacher] = await db.insert(usersTable).values({
      name:         name.trim(),
      email:        email.trim().toLowerCase(),
      passwordHash,
      phone:        phone?.trim() || null,
      department:   department?.trim() || null,
      role:         "teacher",
      accountType:  "teacher",
      isActive:     true,
      grade:        0,
      employeeId:   employeeId?.trim() || null,
      qualification: qualification?.trim() || null,
      experienceYears: experienceYears != null ? Number(experienceYears) : null,
      teachingSubjectsJson: Array.isArray(teachingSubjects) ? JSON.stringify(teachingSubjects) : null,
      teachingGradesJson: Array.isArray(teachingGrades) ? JSON.stringify(teachingGrades) : null,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
    }).returning({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      phone: usersTable.phone, role: usersTable.role, department: usersTable.department,
      isActive: usersTable.isActive, avatarUrl: usersTable.avatarUrl,
      createdAt: usersTable.createdAt, lastLoginDate: usersTable.lastLoginDate,
      employeeId: usersTable.employeeId, qualification: usersTable.qualification,
      experienceYears: usersTable.experienceYears, joiningDate: usersTable.joiningDate,
    });

    const actor = req.authUser!;
    await logTeacherAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "teacher_created", actionLabel: "Created Teacher",
      targetId: teacher.id, targetName: teacher.name,
      afterValue: { name: teacher.name, email: teacher.email },
    });

    res.status(201).json({ success: true, teacher: { ...teacher, coursesCount: 0, classesCount: 0 } });
  } catch (err) {
    req.log.error({ err }, "teacher create error");
    res.status(500).json({ error: "Failed to create teacher" });
  }
});

// ── Update Teacher ────────────────────────────────────────────────────────────
router.patch("/admin/cc/teachers/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const {
    name, phone, department, isActive, force,
    employeeId, qualification, experienceYears, teachingSubjects, teachingGrades, joiningDate,
  } = req.body as {
    name?: string; phone?: string; department?: string; isActive?: boolean; force?: boolean;
    employeeId?: string; qualification?: string; experienceYears?: number;
    teachingSubjects?: string[]; teachingGrades?: number[]; joiningDate?: string;
  };
  try {
    const [before] = await db.select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, department: usersTable.department, isActive: usersTable.isActive })
      .from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.role, "teacher"))).limit(1);
    if (!before) { res.status(404).json({ error: "Teacher not found" }); return; }

    // Guard: deactivating a teacher with active course assignments or upcoming
    // live classes needs explicit confirmation (force=true), so admins don't
    // silently orphan scheduled classes.
    if (isActive === false && before.isActive !== false && !force) {
      const [[{ courseCnt }], [{ upcomingCnt }]] = await Promise.all([
        db.select({ courseCnt: count() }).from(teacherCoursesTable).where(eq(teacherCoursesTable.teacherId, id)),
        db.select({ upcomingCnt: count() }).from(liveClassesTable)
          .where(and(eq(liveClassesTable.teacherId, id), eq(liveClassesTable.status, "upcoming"))),
      ]);
      if (courseCnt > 0 || upcomingCnt > 0) {
        res.status(409).json({
          error: "This teacher has active course assignments or upcoming live classes.",
          requiresConfirmation: true,
          activeCourseAssignments: courseCnt,
          upcomingClasses: upcomingCnt,
        });
        return;
      }
    }

    if (employeeId?.trim()) {
      const dupe = await db.select({ id: usersTable.id })
        .from(usersTable).where(eq(usersTable.employeeId, employeeId.trim())).limit(1);
      if (dupe.length > 0 && dupe[0].id !== id) { res.status(400).json({ error: "A teacher with this Employee ID already exists" }); return; }
    }

    const updates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined && name.trim())  updates.name       = name.trim();
    if (phone !== undefined)                updates.phone      = phone || null;
    if (department !== undefined)           updates.department = department || null;
    if (isActive !== undefined)             updates.isActive   = isActive;
    if (employeeId !== undefined)           updates.employeeId = employeeId?.trim() || null;
    if (qualification !== undefined)        updates.qualification = qualification?.trim() || null;
    if (experienceYears !== undefined)      updates.experienceYears = experienceYears != null ? Number(experienceYears) : null;
    if (teachingSubjects !== undefined)     updates.teachingSubjectsJson = Array.isArray(teachingSubjects) ? JSON.stringify(teachingSubjects) : null;
    if (teachingGrades !== undefined)       updates.teachingGradesJson = Array.isArray(teachingGrades) ? JSON.stringify(teachingGrades) : null;
    if (joiningDate !== undefined)          updates.joiningDate = joiningDate ? new Date(joiningDate) : null;

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id, name: usersTable.name, phone: usersTable.phone, department: usersTable.department, isActive: usersTable.isActive,
        employeeId: usersTable.employeeId, qualification: usersTable.qualification, experienceYears: usersTable.experienceYears,
        teachingSubjectsJson: usersTable.teachingSubjectsJson, teachingGradesJson: usersTable.teachingGradesJson, joiningDate: usersTable.joiningDate,
      });

    const actor = req.authUser!;
    await logTeacherAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: isActive !== undefined ? (isActive ? "teacher_activated" : "teacher_deactivated") : "teacher_updated",
      actionLabel: isActive !== undefined ? (isActive ? "Activated Teacher" : "Deactivated Teacher") : "Updated Teacher",
      targetId: id, targetName: before.name,
      beforeValue: before, afterValue: updated,
    });

    res.json({
      success: true,
      teacher: {
        ...updated,
        teachingSubjects: parseJsonArray(updated.teachingSubjectsJson),
        teachingGrades: parseJsonArray(updated.teachingGradesJson),
      },
    });
  } catch (err) {
    req.log.error({ err }, "teacher update error");
    res.status(500).json({ error: "Failed to update teacher" });
  }
});

// ── Course/Subject Assignment (Program → Course → Subject → Teacher) ─────────
// Only active teachers may be assigned. A teacher can hold many assignments
// across grades/courses/subjects (unlike Mentors, who are grade-scoped).
router.post("/admin/cc/teachers/:id/assignments", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { courseId, courseSubjectId } = req.body as { courseId?: number; courseSubjectId?: number | null };
  if (!courseId) { res.status(400).json({ error: "courseId is required" }); return; }

  try {
    const [teacher] = await db.select({ id: usersTable.id, name: usersTable.name, isActive: usersTable.isActive })
      .from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.role, "teacher"))).limit(1);
    if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }
    if (!teacher.isActive) { res.status(400).json({ error: "Cannot assign courses to an inactive teacher" }); return; }

    const [course] = await db.select({ id: coursesTable.id, title: coursesTable.title })
      .from(coursesTable).where(eq(coursesTable.id, Number(courseId))).limit(1);
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }

    if (courseSubjectId) {
      const [subj] = await db.select({ id: courseSubjectsTable.id })
        .from(courseSubjectsTable)
        .where(and(eq(courseSubjectsTable.id, Number(courseSubjectId)), eq(courseSubjectsTable.courseId, Number(courseId))))
        .limit(1);
      if (!subj) { res.status(400).json({ error: "Subject does not belong to this course" }); return; }
    }

    const [row] = await db.insert(teacherCoursesTable).values({
      teacherId: id,
      courseId: Number(courseId),
      courseSubjectId: courseSubjectId ? Number(courseSubjectId) : null,
    }).onConflictDoNothing().returning();

    if (!row) { res.status(409).json({ error: "This teacher is already assigned to this course/subject" }); return; }

    const actor = req.authUser!;
    await logTeacherAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "teacher_course_assigned", actionLabel: "Assigned Course/Subject to Teacher",
      targetId: id, targetName: teacher.name,
      afterValue: { courseId: course.id, courseTitle: course.title, courseSubjectId: courseSubjectId ?? null },
    });

    res.status(201).json({ success: true, assignment: row });
  } catch (err) {
    req.log.error({ err }, "teacher assignment create error");
    res.status(500).json({ error: "Failed to assign course" });
  }
});

router.delete("/admin/cc/teachers/:id/assignments/:assignmentId", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const assignmentId = parseInt(String(req.params.assignmentId), 10);
  if (isNaN(id) || isNaN(assignmentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [row] = await db.select().from(teacherCoursesTable)
      .where(and(eq(teacherCoursesTable.id, assignmentId), eq(teacherCoursesTable.teacherId, id))).limit(1);
    if (!row) { res.status(404).json({ error: "Assignment not found" }); return; }

    await db.delete(teacherCoursesTable).where(eq(teacherCoursesTable.id, assignmentId));

    const [teacher] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
    const actor = req.authUser!;
    await logTeacherAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "teacher_course_unassigned", actionLabel: "Removed Course/Subject Assignment",
      targetId: id, targetName: teacher?.name ?? String(id),
      beforeValue: row,
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "teacher assignment delete error");
    res.status(500).json({ error: "Failed to remove assignment" });
  }
});

// ── Active teachers dropdown (for Assign Course / Schedule Live Class UIs) ──
router.get("/admin/cc/teachers-active", adminOnly, async (_req, res) => {
  const rows = await db.select({ id: usersTable.id, name: usersTable.name, employeeId: usersTable.employeeId })
    .from(usersTable)
    .where(and(eq(usersTable.role, "teacher"), eq(usersTable.isActive, true)))
    .orderBy(asc(usersTable.name));
  res.json(rows);
});

export default router;
