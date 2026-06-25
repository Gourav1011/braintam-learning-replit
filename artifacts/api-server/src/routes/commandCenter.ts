import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  demoBatchesTable,
  employeeCheckinsTable,
  auditLogsTable,
  ignitePaidStudentsTable,
} from "@workspace/db";
import { requireRole } from "../middlewares/auth.js";
import { eq, and, gte, lt, desc, sql, ne, ilike, or, asc, count, inArray } from "drizzle-orm";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

const STAFF_ROLES = ["admin", "super_admin", "manager", "assistant_manager", "sales_mentor", "academic_mentor", "teacher", "mentor"];
const VALID_ROLES = ["super_admin", "admin", "manager", "assistant_manager", "sales_mentor", "academic_mentor", "teacher", "mentor"] as const;
const DEPARTMENTS = ["Administration", "Operations", "Ignite", "Mastery", "Teaching", "Support"] as const;

// ── Audit log helper ─────────────────────────────────────────────────────────
async function logStaffAction(opts: {
  actorId: number; actorName: string; actorRole: string;
  action: string; actionLabel: string; module: string;
  targetId: number; targetName: string; targetType: string;
  beforeValue?: unknown; afterValue?: unknown;
}) {
  try {
    await db.insert(auditLogsTable).values({
      actorId: opts.actorId,
      actorName: opts.actorName,
      actorRole: opts.actorRole,
      action: opts.action,
      actionLabel: opts.actionLabel,
      category: "staff",
      module: opts.module,
      targetType: opts.targetType,
      targetId: opts.targetId,
      targetName: opts.targetName,
      beforeValue: opts.beforeValue ?? null,
      afterValue: opts.afterValue ?? null,
    });
  } catch (_) { /* audit failures are non-fatal */ }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/admin/command-center/dashboard", adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay   = new Date(`${todayStr}T23:59:59.999Z`);

    const [allUsers, demoBatches, todayCheckins, recentLogs, paidStudents] = await Promise.all([
      db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role, isActive: usersTable.isActive, createdAt: usersTable.createdAt, lastLoginDate: usersTable.lastLoginDate })
        .from(usersTable).where(ne(usersTable.role, "student")),
      db.select({ id: demoBatchesTable.id, isActive: demoBatchesTable.isActive, status: demoBatchesTable.status }).from(demoBatchesTable),
      db.select({ userId: employeeCheckinsTable.userId }).from(employeeCheckinsTable)
        .where(and(gte(employeeCheckinsTable.createdAt, startOfDay), lt(employeeCheckinsTable.createdAt, endOfDay))),
      db.select({ id: auditLogsTable.id, actorName: auditLogsTable.actorName, actorRole: auditLogsTable.actorRole, action: auditLogsTable.action, actionLabel: auditLogsTable.actionLabel, module: auditLogsTable.module, targetName: auditLogsTable.targetName, targetType: auditLogsTable.targetType, createdAt: auditLogsTable.createdAt })
        .from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(12),
      db.select({ id: ignitePaidStudentsTable.id, assignmentStatus: ignitePaidStudentsTable.assignmentStatus }).from(ignitePaidStudentsTable),
    ]);

    const staffUsers  = allUsers.filter(u => STAFF_ROLES.includes(u.role));
    const activeStaff = staffUsers.filter(u => u.isActive);
    const activeMentors  = activeStaff.filter(u => ["mentor","academic_mentor","sales_mentor"].includes(u.role));
    const activeTeachers = activeStaff.filter(u => u.role === "teacher");
    const [{ cnt: studentCount }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(usersTable).where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true)));
    const activeDemoBatches = demoBatches.filter(b => b.isActive && b.status !== "completed").length;
    const paidUnassigned   = paidStudents.filter(p => p.assignmentStatus === "unassigned").length;

    const staffByRole: Record<string, { total: number; active: number }> = {};
    for (const u of staffUsers) {
      if (!staffByRole[u.role]) staffByRole[u.role] = { total: 0, active: 0 };
      staffByRole[u.role].total++;
      if (u.isActive) staffByRole[u.role].active++;
    }

    res.json({
      kpis: { totalStaff: staffUsers.length, activeStaff: activeStaff.length, activeMentors: activeMentors.length, activeTeachers: activeTeachers.length, totalStudents: studentCount ?? 0, activeDemoBatches, todayCheckins: todayCheckins.length, paidUnassigned },
      staffDistribution: Object.entries(staffByRole).map(([role, v]) => ({ role, ...v })).sort((a, b) => b.total - a.total),
      recentActivity: recentLogs,
      pendingActions: paidUnassigned > 0 ? [{ label: "Unassigned Paid Students", count: paidUnassigned, priority: "high" }] : [],
      systemHealth: { api: "ok", db: "ok", checkedAt: now.toISOString() },
    });
  } catch (err) {
    req.log.error({ err }, "command-center dashboard error");
    res.status(500).json({ error: "Failed to load Command Center dashboard" });
  }
});

// ── Staff List ────────────────────────────────────────────────────────────────
router.get("/admin/staff", adminOnly, async (req, res) => {
  try {
    const {
      search = "", role = "all", department = "all", status = "all",
      sort = "name", order = "asc", page = "1", limit = "15",
    } = req.query as Record<string, string>;

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const offset   = (pageNum - 1) * pageSize;

    const conditions = [inArray(usersTable.role, STAFF_ROLES)];

    if (search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(or(ilike(usersTable.name, q), ilike(usersTable.email, q), ilike(usersTable.phone, q))!);
    }
    if (role !== "all") conditions.push(eq(usersTable.role, role));
    if (department !== "all") conditions.push(eq(usersTable.department, department));
    if (status === "active")   conditions.push(eq(usersTable.isActive, true));
    if (status === "inactive") conditions.push(eq(usersTable.isActive, false));

    const where = and(...conditions);

    const sortCol = sort === "role" ? usersTable.role : sort === "createdAt" ? usersTable.createdAt : sort === "lastActive" ? usersTable.lastLoginDate : usersTable.name;
    const orderFn = order === "desc" ? desc : asc;

    const [items, [{ total }]] = await Promise.all([
      db.select({
        id: usersTable.id, name: usersTable.name, email: usersTable.email,
        phone: usersTable.phone, role: usersTable.role, department: usersTable.department,
        isActive: usersTable.isActive, avatarUrl: usersTable.avatarUrl,
        createdAt: usersTable.createdAt, lastLoginDate: usersTable.lastLoginDate,
      }).from(usersTable).where(where).orderBy(orderFn(sortCol as any)).limit(pageSize).offset(offset),
      db.select({ total: count() }).from(usersTable).where(where),
    ]);

    res.json({ items, total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    req.log.error({ err }, "staff list error");
    res.status(500).json({ error: "Failed to list staff" });
  }
});

// ── Staff Profile ─────────────────────────────────────────────────────────────
router.get("/admin/staff/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [staff] = await db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      phone: usersTable.phone, role: usersTable.role, department: usersTable.department,
      isActive: usersTable.isActive, avatarUrl: usersTable.avatarUrl,
      createdAt: usersTable.createdAt, lastLoginDate: usersTable.lastLoginDate, updatedAt: usersTable.updatedAt,
    }).from(usersTable).where(and(eq(usersTable.id, id), inArray(usersTable.role, STAFF_ROLES))).limit(1);

    if (!staff) { res.status(404).json({ error: "Staff member not found" }); return; }

    const recentActivity = await db.select({
      id: auditLogsTable.id, action: auditLogsTable.action, actionLabel: auditLogsTable.actionLabel,
      targetName: auditLogsTable.targetName, module: auditLogsTable.module, createdAt: auditLogsTable.createdAt,
    }).from(auditLogsTable).where(eq(auditLogsTable.actorId, id)).orderBy(desc(auditLogsTable.createdAt)).limit(10);

    res.json({ profile: staff, recentActivity });
  } catch (err) {
    req.log.error({ err }, "staff profile error");
    res.status(500).json({ error: "Failed to load staff profile" });
  }
});

// ── Update Staff ──────────────────────────────────────────────────────────────
router.patch("/admin/staff/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, phone, department, isActive } = req.body as { name?: string; phone?: string; department?: string; isActive?: boolean };
  try {
    const [before] = await db.select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, department: usersTable.department, isActive: usersTable.isActive, role: usersTable.role })
      .from(usersTable).where(and(eq(usersTable.id, id), inArray(usersTable.role, STAFF_ROLES))).limit(1);
    if (!before) { res.status(404).json({ error: "Staff member not found" }); return; }

    const updates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined && name.trim())          updates.name       = name.trim();
    if (phone !== undefined)                         updates.phone      = phone || null;
    if (department !== undefined)                    updates.department = department || null;
    if (isActive !== undefined)                      updates.isActive   = isActive;

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, department: usersTable.department, isActive: usersTable.isActive });

    const actor = req.authUser!;
    await logStaffAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: isActive !== undefined ? (isActive ? "staff_activated" : "staff_deactivated") : "staff_updated",
      actionLabel: isActive !== undefined ? (isActive ? "Activated Staff" : "Deactivated Staff") : "Updated Staff",
      module: "staff",
      targetId: id, targetName: before.name, targetType: "user",
      beforeValue: before, afterValue: updated,
    });

    res.json({ success: true, staff: updated });
  } catch (err) {
    req.log.error({ err }, "staff update error");
    res.status(500).json({ error: "Failed to update staff member" });
  }
});

// ── Change Role ───────────────────────────────────────────────────────────────
router.post("/admin/staff/:id/change-role", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { role } = req.body as { role?: string };
  if (!role || !VALID_ROLES.includes(role as any)) {
    res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` });
    return;
  }

  try {
    const [current] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
      .from(usersTable).where(and(eq(usersTable.id, id), inArray(usersTable.role, STAFF_ROLES))).limit(1);
    if (!current) { res.status(404).json({ error: "Staff member not found" }); return; }

    // Prevent removing last super_admin
    if (current.role === "super_admin" && role !== "super_admin") {
      const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(usersTable).where(and(eq(usersTable.role, "super_admin"), eq(usersTable.isActive, true)));
      if ((cnt ?? 0) <= 1) {
        res.status(400).json({ error: "Cannot change role: this is the last active Super Admin." });
        return;
      }
    }

    await db.update(usersTable).set({ role, updatedAt: new Date() }).where(eq(usersTable.id, id));

    const actor = req.authUser!;
    await logStaffAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "role_changed", actionLabel: "Changed Role",
      module: "staff", targetId: id, targetName: current.name, targetType: "user",
      beforeValue: { role: current.role }, afterValue: { role },
    });

    res.json({ success: true, previousRole: current.role, newRole: role });
  } catch (err) {
    req.log.error({ err }, "change role error");
    res.status(500).json({ error: "Failed to change role" });
  }
});

// ── Reset Password (placeholder) ──────────────────────────────────────────────
router.post("/admin/staff/:id/reset-password", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [staff] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(and(eq(usersTable.id, id), inArray(usersTable.role, STAFF_ROLES))).limit(1);
    if (!staff) { res.status(404).json({ error: "Staff member not found" }); return; }

    const actor = req.authUser!;
    await logStaffAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "password_reset_requested", actionLabel: "Password Reset Requested",
      module: "staff", targetId: id, targetName: staff.name, targetType: "user",
      afterValue: { note: "placeholder — email integration not yet configured" },
    });

    res.json({ success: true, message: "Password reset has been logged. Email integration coming soon." });
  } catch (err) {
    req.log.error({ err }, "reset password error");
    res.status(500).json({ error: "Failed to process reset password request" });
  }
});

export default router;
