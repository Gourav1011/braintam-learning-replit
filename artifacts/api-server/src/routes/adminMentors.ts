import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  auditLogsTable,
  mentorStudentAssignmentsTable,
  ignitePaidStudentsTable,
  demoBatchEnrollmentsTable,
} from "@workspace/db";
import { requireRole } from "../middlewares/auth.js";
import {
  eq, and, gte, lt, desc, sql, ilike, or, asc, count,
  inArray, isNotNull, ne,
} from "drizzle-orm";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

const MENTOR_ROLES = ["mentor", "sales_mentor", "academic_mentor"] as const;
const VALID_TYPES  = ["sales_mentor", "academic_mentor"] as const;

// ── Derive normalised mentor type from row ───────────────────────────────────
function normType(role: string, mentorType: string | null): string {
  if (role === "sales_mentor"   || (role === "mentor" && mentorType === "sales"))    return "sales_mentor";
  if (role === "academic_mentor"|| (role === "mentor" && mentorType === "academic")) return "academic_mentor";
  return "mentor";
}

// ── Audit helper ─────────────────────────────────────────────────────────────
async function logMentorAction(opts: {
  actorId: number; actorName: string; actorRole: string;
  action: string; actionLabel: string;
  targetId: number; targetName: string;
  beforeValue?: unknown; afterValue?: unknown;
}) {
  try {
    await db.insert(auditLogsTable).values({
      actorId: opts.actorId, actorName: opts.actorName, actorRole: opts.actorRole,
      action: opts.action, actionLabel: opts.actionLabel,
      category: "staff", module: "mentor",
      targetType: "user", targetId: opts.targetId, targetName: opts.targetName,
      beforeValue: opts.beforeValue ?? null, afterValue: opts.afterValue ?? null,
    });
  } catch (_) { /* non-fatal */ }
}

// ── Mentor List + KPIs ────────────────────────────────────────────────────────
router.get("/admin/cc/mentors", adminOnly, async (req, res) => {
  try {
    const {
      search = "", type = "all", department = "all", status = "all",
      sort = "name", order = "asc", page = "1", limit = "15",
    } = req.query as Record<string, string>;

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const offset   = (pageNum - 1) * pageSize;

    const conditions = [inArray(usersTable.role, [...MENTOR_ROLES])];

    if (search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(or(ilike(usersTable.name, q), ilike(usersTable.email, q), ilike(usersTable.phone, q))!);
    }
    if (type !== "all") {
      if (type === "sales_mentor")
        conditions.push(or(eq(usersTable.role, "sales_mentor"), and(eq(usersTable.role, "mentor"), eq(usersTable.mentorType, "sales"))!)!);
      else if (type === "academic_mentor")
        conditions.push(or(eq(usersTable.role, "academic_mentor"), and(eq(usersTable.role, "mentor"), eq(usersTable.mentorType, "academic"))!)!);
    }
    if (department !== "all") conditions.push(eq(usersTable.department, department));
    if (status === "active")   conditions.push(eq(usersTable.isActive, true));
    if (status === "inactive") conditions.push(eq(usersTable.isActive, false));

    const where = and(...conditions);

    const sortCol =
      sort === "createdAt"  ? usersTable.createdAt :
      sort === "lastActive" ? usersTable.lastLoginDate :
      usersTable.name;
    const orderFn = order === "desc" ? desc : asc;

    const [mentors, [{ total }], allMentorRows, assignedRaw, convertedRaw, kpiAll] = await Promise.all([
      db.select({
        id: usersTable.id, name: usersTable.name, email: usersTable.email,
        phone: usersTable.phone, role: usersTable.role, mentorType: usersTable.mentorType,
        department: usersTable.department, isActive: usersTable.isActive,
        avatarUrl: usersTable.avatarUrl, createdAt: usersTable.createdAt,
        lastLoginDate: usersTable.lastLoginDate,
      }).from(usersTable).where(where).orderBy(orderFn(sortCol as any)).limit(pageSize).offset(offset),

      db.select({ total: count() }).from(usersTable).where(where),

      // all mentors (unfiltered) for KPIs
      db.select({ id: usersTable.id, role: usersTable.role, mentorType: usersTable.mentorType, isActive: usersTable.isActive })
        .from(usersTable).where(inArray(usersTable.role, [...MENTOR_ROLES])),

      // assigned student counts per mentor
      db.select({ mentorId: mentorStudentAssignmentsTable.mentorId, cnt: count() })
        .from(mentorStudentAssignmentsTable)
        .where(eq(mentorStudentAssignmentsTable.isActive, true))
        .groupBy(mentorStudentAssignmentsTable.mentorId),

      // converted (ignite paid) counts per mentor
      db.select({ mentorId: ignitePaidStudentsTable.assignedMentorId, cnt: count() })
        .from(ignitePaidStudentsTable)
        .where(isNotNull(ignitePaidStudentsTable.assignedMentorId))
        .groupBy(ignitePaidStudentsTable.assignedMentorId),

      // kpi: total assigned across all mentors (unfiltered)
      db.select({ cnt: count() }).from(mentorStudentAssignmentsTable).where(eq(mentorStudentAssignmentsTable.isActive, true)),
    ]);

    const assignedMap  = new Map(assignedRaw.map(r => [r.mentorId, r.cnt]));
    const convertedMap = new Map(convertedRaw.map(r => [r.mentorId!, r.cnt]));

    // Augment paginated list
    const items = mentors.map(m => {
      const assigned  = assignedMap.get(m.id)  ?? 0;
      const converted = convertedMap.get(m.id) ?? 0;
      const convPct   = assigned > 0 ? Math.round((converted / assigned) * 100) : 0;
      return { ...m, normType: normType(m.role, m.mentorType), assignedStudents: assigned, convertedStudents: converted, conversionPct: convPct };
    });

    // Sort by assignedStudents / conversionPct in JS (DB can't do computed cols easily)
    if (sort === "assignedStudents") items.sort((a, b) => order === "desc" ? b.assignedStudents - a.assignedStudents : a.assignedStudents - b.assignedStudents);
    if (sort === "conversionPct")    items.sort((a, b) => order === "desc" ? b.conversionPct - a.conversionPct : a.conversionPct - b.conversionPct);

    // KPIs from unfiltered all-mentor rows
    const totalMentors    = allMentorRows.length;
    const activeMentors   = allMentorRows.filter(m => m.isActive).length;
    const salesMentors    = allMentorRows.filter(m => normType(m.role, m.mentorType) === "sales_mentor").length;
    const academicMentors = allMentorRows.filter(m => normType(m.role, m.mentorType) === "academic_mentor").length;
    const totalAssigned   = kpiAll[0]?.cnt ?? 0;
    const totalConverted  = [...convertedRaw].reduce((s, r) => s + r.cnt, 0);
    const overallConvPct  = totalAssigned > 0 ? Math.round((totalConverted / totalAssigned) * 100) : 0;

    res.json({
      items, total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize),
      kpis: { totalMentors, activeMentors, salesMentors, academicMentors, totalAssigned, overallConvPct },
    });
  } catch (err) {
    req.log.error({ err }, "mentor list error");
    res.status(500).json({ error: "Failed to list mentors" });
  }
});

// ── Mentor Profile ────────────────────────────────────────────────────────────
router.get("/admin/cc/mentors/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [mentor] = await db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      phone: usersTable.phone, role: usersTable.role, mentorType: usersTable.mentorType,
      department: usersTable.department, isActive: usersTable.isActive,
      avatarUrl: usersTable.avatarUrl, createdAt: usersTable.createdAt,
      lastLoginDate: usersTable.lastLoginDate, updatedAt: usersTable.updatedAt,
    }).from(usersTable).where(and(eq(usersTable.id, id), inArray(usersTable.role, [...MENTOR_ROLES]))).limit(1);
    if (!mentor) { res.status(404).json({ error: "Mentor not found" }); return; }

    const [assignedRows, convertedRows, activity] = await Promise.all([
      db.select({ cnt: count() }).from(mentorStudentAssignmentsTable)
        .where(and(eq(mentorStudentAssignmentsTable.mentorId, id), eq(mentorStudentAssignmentsTable.isActive, true))),
      db.select({ cnt: count() }).from(ignitePaidStudentsTable)
        .where(eq(ignitePaidStudentsTable.assignedMentorId, id)),
      db.select({ id: auditLogsTable.id, action: auditLogsTable.action, actionLabel: auditLogsTable.actionLabel, module: auditLogsTable.module, targetName: auditLogsTable.targetName, createdAt: auditLogsTable.createdAt })
        .from(auditLogsTable).where(eq(auditLogsTable.actorId, id)).orderBy(desc(auditLogsTable.createdAt)).limit(10),
    ]);

    const assigned  = assignedRows[0]?.cnt ?? 0;
    const converted = convertedRows[0]?.cnt ?? 0;
    const convPct   = assigned > 0 ? Math.round((converted / assigned) * 100) : 0;
    const mType     = normType(mentor.role, mentor.mentorType);

    const performance = {
      assignedStudents: assigned,
      convertedStudents: mType === "sales_mentor" ? converted : null,
      conversionPct: mType === "sales_mentor" ? convPct : null,
      attendancePct: mType === "academic_mentor" ? 0 : null,  // future hook
      homeworkCompletionPct: mType === "academic_mentor" ? 0 : null, // future hook
    };

    // Static read-only permissions based on mentor type
    const permissions = [
      { module: "Dashboard",          view: true,  create: false, edit: false,  del: false },
      { module: "My Students",        view: true,  create: false, edit: true,   del: false },
      { module: "Follow-ups",         view: true,  create: true,  edit: true,   del: false },
      { module: "Homework",           view: mType === "academic_mentor", create: mType === "academic_mentor", edit: false, del: false },
      { module: "Ignite CRM",         view: mType === "sales_mentor",    create: false, edit: false, del: false },
      { module: "Audit Logs",         view: false, create: false, edit: false,  del: false },
      { module: "Staff Management",   view: false, create: false, edit: false,  del: false },
    ];

    res.json({ profile: { ...mentor, normType: mType }, performance, permissions, activity });
  } catch (err) {
    req.log.error({ err }, "mentor profile error");
    res.status(500).json({ error: "Failed to load mentor profile" });
  }
});

// ── Mentor Assigned Students ──────────────────────────────────────────────────
router.get("/admin/cc/mentors/:id/students", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { page = "1", limit = "15", search = "" } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, parseInt(limit, 10) || 15);
  const offset   = (pageNum - 1) * pageSize;
  try {
    // Get student IDs from mentor_student_assignments
    const assigned = await db.select({
      studentId: mentorStudentAssignmentsTable.studentId,
      assignedAt: mentorStudentAssignmentsTable.assignedAt,
    }).from(mentorStudentAssignmentsTable)
      .where(and(eq(mentorStudentAssignmentsTable.mentorId, id), eq(mentorStudentAssignmentsTable.isActive, true)));

    const studentIds = assigned.map(a => a.studentId);
    if (studentIds.length === 0) {
      res.json({ items: [], total: 0, page: pageNum, pageSize, totalPages: 0 });
      return;
    }

    const conds = [inArray(usersTable.id, studentIds)];
    if (search.trim()) {
      const q = `%${search.trim()}%`;
      conds.push(or(ilike(usersTable.name, q), ilike(usersTable.phone, q))!);
    }

    const [students, [{ total }]] = await Promise.all([
      db.select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, grade: usersTable.grade, isActive: usersTable.isActive, avatarUrl: usersTable.avatarUrl })
        .from(usersTable).where(and(...conds)).orderBy(asc(usersTable.name)).limit(pageSize).offset(offset),
      db.select({ total: count() }).from(usersTable).where(and(...conds)),
    ]);

    const assignedMap = new Map(assigned.map(a => [a.studentId, a.assignedAt]));
    const items = students.map(s => ({ ...s, assignedAt: assignedMap.get(s.id) ?? null }));

    res.json({ items, total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    req.log.error({ err }, "mentor students error");
    res.status(500).json({ error: "Failed to load assigned students" });
  }
});

// ── Update Mentor ─────────────────────────────────────────────────────────────
router.patch("/admin/cc/mentors/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, phone, department, isActive } = req.body as { name?: string; phone?: string; department?: string; isActive?: boolean };
  try {
    const [before] = await db.select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, department: usersTable.department, isActive: usersTable.isActive, role: usersTable.role })
      .from(usersTable).where(and(eq(usersTable.id, id), inArray(usersTable.role, [...MENTOR_ROLES]))).limit(1);
    if (!before) { res.status(404).json({ error: "Mentor not found" }); return; }

    const updates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined && name.trim())  updates.name       = name.trim();
    if (phone !== undefined)                updates.phone      = phone || null;
    if (department !== undefined)           updates.department = department || null;
    if (isActive !== undefined)             updates.isActive   = isActive;

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, department: usersTable.department, isActive: usersTable.isActive });

    const actor = req.authUser!;
    await logMentorAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: isActive !== undefined ? (isActive ? "mentor_activated" : "mentor_deactivated") : "mentor_updated",
      actionLabel: isActive !== undefined ? (isActive ? "Activated Mentor" : "Deactivated Mentor") : "Updated Mentor",
      targetId: id, targetName: before.name,
      beforeValue: before, afterValue: updated,
    });

    res.json({ success: true, mentor: updated });
  } catch (err) {
    req.log.error({ err }, "mentor update error");
    res.status(500).json({ error: "Failed to update mentor" });
  }
});

// ── Change Mentor Type ────────────────────────────────────────────────────────
router.post("/admin/cc/mentors/:id/change-type", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { type } = req.body as { type?: string };
  if (!type || !VALID_TYPES.includes(type as any)) {
    res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` });
    return;
  }

  try {
    const [current] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role, mentorType: usersTable.mentorType })
      .from(usersTable).where(and(eq(usersTable.id, id), inArray(usersTable.role, [...MENTOR_ROLES]))).limit(1);
    if (!current) { res.status(404).json({ error: "Mentor not found" }); return; }

    const newMentorType = type === "sales_mentor" ? "sales" : "academic";
    await db.update(usersTable).set({ role: type, mentorType: newMentorType, updatedAt: new Date() }).where(eq(usersTable.id, id));

    const actor = req.authUser!;
    await logMentorAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "mentor_type_changed", actionLabel: "Changed Mentor Type",
      targetId: id, targetName: current.name,
      beforeValue: { role: current.role, mentorType: current.mentorType },
      afterValue:  { role: type, mentorType: newMentorType },
    });

    res.json({ success: true, previousType: normType(current.role, current.mentorType), newType: type });
  } catch (err) {
    req.log.error({ err }, "change mentor type error");
    res.status(500).json({ error: "Failed to change mentor type" });
  }
});

export default router;
