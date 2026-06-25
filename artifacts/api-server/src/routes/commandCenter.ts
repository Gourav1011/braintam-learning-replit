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
import { eq, and, gte, lt, desc, sql, ne } from "drizzle-orm";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

const STAFF_ROLES = ["admin", "super_admin", "manager", "assistant_manager", "sales_mentor", "academic_mentor", "teacher", "mentor"];

router.get("/admin/command-center/dashboard", adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay   = new Date(`${todayStr}T23:59:59.999Z`);

    const [
      allUsers,
      demoBatches,
      todayCheckins,
      recentLogs,
      paidStudents,
    ] = await Promise.all([
      db.select({
        id: usersTable.id,
        name: usersTable.name,
        role: usersTable.role,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
        lastLoginDate: usersTable.lastLoginDate,
      }).from(usersTable).where(ne(usersTable.role, "student")),

      db.select({ id: demoBatchesTable.id, isActive: demoBatchesTable.isActive, status: demoBatchesTable.status })
        .from(demoBatchesTable),

      db.select({ userId: employeeCheckinsTable.userId })
        .from(employeeCheckinsTable)
        .where(
          and(
            gte(employeeCheckinsTable.createdAt, startOfDay),
            lt(employeeCheckinsTable.createdAt, endOfDay),
          )
        ),

      db.select({
        id: auditLogsTable.id,
        actorName: auditLogsTable.actorName,
        actorRole: auditLogsTable.actorRole,
        action: auditLogsTable.action,
        actionLabel: auditLogsTable.actionLabel,
        module: auditLogsTable.module,
        targetName: auditLogsTable.targetName,
        targetType: auditLogsTable.targetType,
        createdAt: auditLogsTable.createdAt,
      }).from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(12),

      db.select({ id: ignitePaidStudentsTable.id, assignmentStatus: ignitePaidStudentsTable.assignmentStatus })
        .from(ignitePaidStudentsTable),
    ]);

    const staffUsers = allUsers.filter(u => STAFF_ROLES.includes(u.role));
    const activeStaff = staffUsers.filter(u => u.isActive);
    const activeMentors  = activeStaff.filter(u => u.role === "mentor" || u.role === "academic_mentor" || u.role === "sales_mentor");
    const activeTeachers = activeStaff.filter(u => u.role === "teacher");

    const studentCount = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true)));

    const activeDemoBatches = demoBatches.filter(b => b.isActive && b.status !== "completed").length;
    const paidUnassigned = paidStudents.filter(p => p.assignmentStatus === "unassigned").length;

    const staffByRole: Record<string, { total: number; active: number }> = {};
    for (const u of staffUsers) {
      if (!staffByRole[u.role]) staffByRole[u.role] = { total: 0, active: 0 };
      staffByRole[u.role].total++;
      if (u.isActive) staffByRole[u.role].active++;
    }

    const staffDistribution = Object.entries(staffByRole)
      .map(([role, { total, active }]) => ({ role, total, active }))
      .sort((a, b) => b.total - a.total);

    const pendingActions: { label: string; count: number; priority: "high" | "medium" | "low" }[] = [
      ...(paidUnassigned > 0 ? [{ label: "Unassigned Paid Students", count: paidUnassigned, priority: "high" as const }] : []),
    ];

    res.json({
      kpis: {
        totalStaff:       staffUsers.length,
        activeStaff:      activeStaff.length,
        activeMentors:    activeMentors.length,
        activeTeachers:   activeTeachers.length,
        totalStudents:    (studentCount[0]?.cnt ?? 0),
        activeDemoBatches,
        todayCheckins:    todayCheckins.length,
        paidUnassigned,
      },
      staffDistribution,
      recentActivity: recentLogs,
      pendingActions,
      systemHealth: { api: "ok", db: "ok", checkedAt: now.toISOString() },
    });
  } catch (err) {
    req.log.error({ err }, "command-center dashboard error");
    res.status(500).json({ error: "Failed to load Command Center dashboard" });
  }
});

export default router;
