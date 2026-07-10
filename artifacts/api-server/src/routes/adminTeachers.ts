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
  eq, and, desc, ilike, or, asc, count, isNotNull, gte, lte, inArray,
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

// Employee IDs are permanent — generated once at creation time and never
// reassigned or edited, even if the teacher is later disabled. Sequential
// BT-T-0001 style, based on the highest existing numeric suffix so gaps from
// deleted/legacy rows don't cause collisions.
async function generateEmployeeId(): Promise<string> {
  const rows = await db.select({ employeeId: usersTable.employeeId })
    .from(usersTable)
    .where(and(eq(usersTable.role, "teacher"), isNotNull(usersTable.employeeId)));
  let max = 0;
  for (const r of rows) {
    const m = /BT-T-(\d+)/.exec(r.employeeId ?? "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `BT-T-${String(max + 1).padStart(4, "0")}`;
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
        isOnLeave: usersTable.isOnLeave, leaveReason: usersTable.leaveReason, leaveUntil: usersTable.leaveUntil,
      }).from(usersTable).where(where)
        .orderBy(orderFn(sortCol as any)).limit(pageSize).offset(offset),

      db.select({ total: count() }).from(usersTable).where(where),

      // Unfiltered — for KPIs
      db.select({ id: usersTable.id, isActive: usersTable.isActive, isOnLeave: usersTable.isOnLeave })
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
    const onLeaveToday     = allTeacherRows.filter(t => t.isActive && t.isOnLeave).length;
    const totalClasses     = [...classCountsRaw].reduce((s, r) => s + r.cnt, 0);
    const totalCourses     = [...courseCountsRaw].reduce((s, r) => s + r.cnt, 0);

    // Teaching now = active teachers with a live class currently in progress.
    const liveNowRows = await db.select({ teacherId: liveClassesTable.teacherId })
      .from(liveClassesTable)
      .where(and(isNotNull(liveClassesTable.teacherId), eq(liveClassesTable.status, "live")));
    const teachingNowIds = new Set(liveNowRows.map(r => r.teacherId));
    const teachingNow  = teachingNowIds.size;
    const availableNow = allTeacherRows.filter(t => t.isActive && !t.isOnLeave && !teachingNowIds.has(t.id)).length;

    res.json({
      items, total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize),
      kpis: { totalTeachers, activeTeachers, inactiveTeachers, totalClasses, totalCourses, avgAttendance: 0, onLeaveToday, teachingNow, availableNow },
    });
  } catch (err) {
    req.log.error({ err }, "teacher list error");
    res.status(500).json({ error: "Failed to list teachers" });
  }
});

router.get("/admin/cc/teachers/schedule", adminOnly, async (req, res) => {
  const { date } = req.query as Record<string, string>;
  const day = date && !isNaN(Date.parse(date)) ? new Date(date) : new Date();
  const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = new Date(day); dayEnd.setHours(23, 59, 59, 999);

  try {
    const teachers = await db.select({
      id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl,
      isActive: usersTable.isActive, isOnLeave: usersTable.isOnLeave, leaveReason: usersTable.leaveReason,
      teachingSubjectsJson: usersTable.teachingSubjectsJson,
    }).from(usersTable)
      .where(and(eq(usersTable.role, "teacher"), eq(usersTable.isActive, true)))
      .orderBy(asc(usersTable.name));

    const teacherIds = teachers.map(t => t.id);
    const classes = teacherIds.length === 0 ? [] : await db.select({
      id: liveClassesTable.id, teacherId: liveClassesTable.teacherId, title: liveClassesTable.title,
      scheduledAt: liveClassesTable.scheduledAt, duration: liveClassesTable.duration,
      status: liveClassesTable.status, grade: liveClassesTable.grade, subjectId: liveClassesTable.subjectId,
      courseId: liveClassesTable.courseId,
    }).from(liveClassesTable)
      .where(and(
        isNotNull(liveClassesTable.teacherId),
        gte(liveClassesTable.scheduledAt, dayStart),
        lte(liveClassesTable.scheduledAt, dayEnd),
      ));

    const subjectIds = [...new Set(classes.map(c => c.subjectId).filter((v): v is number => v != null))];
    const subjectRows = subjectIds.length === 0 ? [] : await db.select({ id: courseSubjectsTable.id, name: courseSubjectsTable.name })
      .from(courseSubjectsTable).where(inArray(courseSubjectsTable.id, subjectIds));
    const subjectMap = new Map(subjectRows.map(s => [s.id, s.name]));

    const courseIds = [...new Set(classes.map(c => c.courseId).filter((v): v is number => v != null))];
    const courseRows = courseIds.length === 0 ? [] : await db.select({ id: coursesTable.id, courseType: coursesTable.courseType })
      .from(coursesTable).where(inArray(coursesTable.id, courseIds));
    const courseTypeMap = new Map(courseRows.map(c => [c.id, c.courseType]));

    const now = new Date();
    const classesByTeacher = new Map<number, typeof classes>();
    for (const c of classes) {
      if (!c.teacherId) continue;
      if (!classesByTeacher.has(c.teacherId)) classesByTeacher.set(c.teacherId, []);
      classesByTeacher.get(c.teacherId)!.push(c);
    }

    const rows = teachers.map(t => {
      const tClasses = (classesByTeacher.get(t.id) ?? []).map(c => ({
        id: c.id, title: c.title, grade: c.grade,
        subjectName: c.subjectId ? subjectMap.get(c.subjectId) ?? null : null,
        program: c.courseId ? courseTypeMap.get(c.courseId) ?? null : null,
        status: c.status,
        startsAt: c.scheduledAt,
        endsAt: c.scheduledAt ? new Date(new Date(c.scheduledAt).getTime() + (c.duration ?? 60) * 60000) : null,
      })).sort((a, b) => new Date(a.startsAt ?? 0).getTime() - new Date(b.startsAt ?? 0).getTime());

      const current = tClasses.find(c => c.startsAt && c.endsAt && new Date(c.startsAt) <= now && now <= new Date(c.endsAt) && c.status !== "cancelled");
      const next = tClasses.find(c => c.startsAt && new Date(c.startsAt) > now && c.status !== "cancelled");

      return {
        id: t.id, name: t.name, avatarUrl: t.avatarUrl,
        isOnLeave: t.isOnLeave, leaveReason: t.leaveReason,
        teachingSubjects: parseJsonArray(t.teachingSubjectsJson),
        classes: tClasses,
        currentStatus: t.isOnLeave ? "on_leave" : current ? "teaching" : "available",
        currentClass: current ?? null,
        nextClass: next ?? null,
      };
    });

    res.json({ date: dayStart.toISOString().slice(0, 10), teachers: rows });
  } catch (err) {
    req.log.error({ err }, "teacher schedule error");
    res.status(500).json({ error: "Failed to load schedule" });
  }
});

// ── Available Teacher Finder ─────────────────────────────────────────────────
// Finds active, non-leave teachers with no overlapping live class in the given
// window, prioritizing the course's default subject teacher first.
router.get("/admin/cc/teachers/find-available", adminOnly, async (req, res) => {
  const { date, startTime, endTime, courseId, courseSubjectId } = req.query as Record<string, string>;
  if (!date || !startTime || !endTime) { res.status(400).json({ error: "date, startTime and endTime are required" }); return; }

  try {
    const windowStart = new Date(`${date}T${startTime}:00+05:30`);
    const windowEnd   = new Date(`${date}T${endTime}:00+05:30`);
    if (isNaN(windowStart.getTime()) || isNaN(windowEnd.getTime()) || windowEnd <= windowStart) {
      res.status(400).json({ error: "Invalid time window" }); return;
    }
    const dayStart = new Date(windowStart); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(windowStart); dayEnd.setHours(23, 59, 59, 999);

    const teachers = await db.select({
      id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl,
      isOnLeave: usersTable.isOnLeave, teachingSubjectsJson: usersTable.teachingSubjectsJson,
    }).from(usersTable)
      .where(and(eq(usersTable.role, "teacher"), eq(usersTable.isActive, true)))
      .orderBy(asc(usersTable.name));

    const dayClasses = await db.select({
      teacherId: liveClassesTable.teacherId, title: liveClassesTable.title, grade: liveClassesTable.grade,
      scheduledAt: liveClassesTable.scheduledAt, duration: liveClassesTable.duration, status: liveClassesTable.status,
    }).from(liveClassesTable)
      .where(and(isNotNull(liveClassesTable.teacherId), gte(liveClassesTable.scheduledAt, dayStart), lte(liveClassesTable.scheduledAt, dayEnd), or(eq(liveClassesTable.status, "upcoming"), eq(liveClassesTable.status, "live"))!));

    let defaultTeacherId: number | null = null;
    if (courseId) {
      const [defRow] = await db.select({ teacherId: teacherCoursesTable.teacherId })
        .from(teacherCoursesTable)
        .where(and(
          eq(teacherCoursesTable.courseId, Number(courseId)),
          courseSubjectId ? eq(teacherCoursesTable.courseSubjectId, Number(courseSubjectId)) : isNotNull(teacherCoursesTable.teacherId),
        )).limit(1);
      defaultTeacherId = defRow?.teacherId ?? null;
    }

    const results = teachers.map(t => {
      if (t.isOnLeave) return { id: t.id, name: t.name, avatarUrl: t.avatarUrl, available: false, reason: "On Leave", isDefault: t.id === defaultTeacherId };
      const clash = dayClasses.find(c => {
        if (c.teacherId !== t.id) return false;
        const s = new Date(c.scheduledAt!);
        const e = new Date(s.getTime() + (c.duration ?? 60) * 60000);
        return s < windowEnd && e > windowStart;
      });
      if (clash) {
        const s = new Date(clash.scheduledAt!);
        const e = new Date(s.getTime() + (clash.duration ?? 60) * 60000);
        return {
          id: t.id, name: t.name, avatarUrl: t.avatarUrl, available: false,
          reason: `Busy: ${clash.title} (${s.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}–${e.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })})`,
          isDefault: t.id === defaultTeacherId,
        };
      }
      return { id: t.id, name: t.name, avatarUrl: t.avatarUrl, available: true, reason: null, isDefault: t.id === defaultTeacherId };
    }).sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "find available teachers error");
    res.status(500).json({ error: "Failed to find available teachers" });
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
      isOnLeave: usersTable.isOnLeave, leaveReason: usersTable.leaveReason, leaveUntil: usersTable.leaveUntil,
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

// ── Schedule & Availability (Timeline) ────────────────────────────────────────
// Returns each active teacher's live classes for the selected date only —
// never the full history — so the timeline stays fast regardless of scale.

// ── Create Teacher ────────────────────────────────────────────────────────────
router.post("/admin/cc/teachers", adminOnly, async (req, res) => {
  const {
    name, email, password, phone, department,
    qualification, experienceYears, teachingSubjects, teachingGrades, joiningDate,
  } = req.body as {
    name?: string; email?: string; password?: string; phone?: string; department?: string;
    qualification?: string; experienceYears?: number;
    teachingSubjects?: string[]; teachingGrades?: number[]; joiningDate?: string;
  };

  if (!name?.trim())     { res.status(400).json({ error: "Name is required" });     return; }
  if (!email?.trim())    { res.status(400).json({ error: "Email is required" });    return; }
  if (!password?.trim()) { res.status(400).json({ error: "Password is required" }); return; }

  try {
    const existing = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
    if (existing.length > 0) { res.status(400).json({ error: "A user with this email already exists" }); return; }

    // Employee ID is system-generated and permanent — never accepted from the client.
    const employeeId = await generateEmployeeId();

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
      employeeId,
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
    qualification, experienceYears, teachingSubjects, teachingGrades, joiningDate,
    isOnLeave, leaveReason, leaveUntil,
  } = req.body as {
    name?: string; phone?: string; department?: string; isActive?: boolean; force?: boolean;
    qualification?: string; experienceYears?: number;
    teachingSubjects?: string[]; teachingGrades?: number[]; joiningDate?: string;
    isOnLeave?: boolean; leaveReason?: string; leaveUntil?: string | null;
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

    // Employee ID is permanent — never accepted for update, even when disabled/reactivated.

    const updates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined && name.trim())  updates.name       = name.trim();
    if (phone !== undefined)                updates.phone      = phone || null;
    if (department !== undefined)           updates.department = department || null;
    if (isActive !== undefined)             updates.isActive   = isActive;
    if (qualification !== undefined)        updates.qualification = qualification?.trim() || null;
    if (experienceYears !== undefined)      updates.experienceYears = experienceYears != null ? Number(experienceYears) : null;
    if (teachingSubjects !== undefined)     updates.teachingSubjectsJson = Array.isArray(teachingSubjects) ? JSON.stringify(teachingSubjects) : null;
    if (teachingGrades !== undefined)       updates.teachingGradesJson = Array.isArray(teachingGrades) ? JSON.stringify(teachingGrades) : null;
    if (joiningDate !== undefined)          updates.joiningDate = joiningDate ? new Date(joiningDate) : null;
    if (isOnLeave !== undefined)            updates.isOnLeave  = isOnLeave;
    if (leaveReason !== undefined)          updates.leaveReason = leaveReason?.trim() || null;
    if (leaveUntil !== undefined)           updates.leaveUntil = leaveUntil ? new Date(leaveUntil) : null;
    if (isOnLeave === false) { updates.leaveReason = null; updates.leaveUntil = null; }

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id, name: usersTable.name, phone: usersTable.phone, department: usersTable.department, isActive: usersTable.isActive,
        employeeId: usersTable.employeeId, qualification: usersTable.qualification, experienceYears: usersTable.experienceYears,
        teachingSubjectsJson: usersTable.teachingSubjectsJson, teachingGradesJson: usersTable.teachingGradesJson, joiningDate: usersTable.joiningDate,
        isOnLeave: usersTable.isOnLeave, leaveReason: usersTable.leaveReason, leaveUntil: usersTable.leaveUntil,
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
