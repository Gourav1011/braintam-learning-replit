import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, auditLogsTable, adminPermissionsTable,
  coursesTable, announcementsTable, homeworkTable, testsTable,
  bannersTable, liveClassesTable, ALL_MODULES,
} from "@workspace/db";
import { eq, desc, and, gte, lte, or, ilike, sql, inArray } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";
import { logFromReq } from "../utils/audit.js";
import crypto from "crypto";

const router = Router();
const superAdminOnly = requireRole("super_admin");

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw + "braintam_salt").digest("hex");
}

function generateToken(userId: number): string {
  return Buffer.from(`${userId}:${Date.now()}:braintam`).toString("base64");
}

// ── Create Admin ────────────────────────────────────────────────────────────
router.post("/superadmin/admins", superAdminOnly, async (req, res) => {
  const { name, email, password, permissions } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, password required" }); return;
  }

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable)
    .where(eq(usersTable.email, email)).limit(1);
  if (existing) { res.status(409).json({ error: "Email already in use" }); return; }

  const [created] = await db.insert(usersTable).values({
    name, email,
    passwordHash: hashPassword(password),
    role: "admin",
    accountType: "admin",
    isActive: true,
  }).returning();

  // Seed permissions if provided
  if (Array.isArray(permissions) && permissions.length > 0) {
    await db.insert(adminPermissionsTable).values(
      permissions.map((p: { module: string; canView?: boolean; canCreate?: boolean; canEdit?: boolean; canArchive?: boolean }) => ({
        userId: created.id,
        module: p.module,
        canView: p.canView ?? true,
        canCreate: p.canCreate ?? false,
        canEdit: p.canEdit ?? false,
        canArchive: p.canArchive ?? false,
      }))
    );
  } else {
    // Default: view-only on all modules
    await db.insert(adminPermissionsTable).values(
      ALL_MODULES.map(m => ({ userId: created.id, module: m, canView: true, canCreate: false, canEdit: false, canArchive: false }))
    );
  }

  await logFromReq({ req, action: "admin_created", actionLabel: `Created admin account for ${name}`, category: "system", module: "Users", targetType: "user", targetId: created.id, targetName: name });

  res.json({ ok: true, id: created.id });
});

// ── List Admins ─────────────────────────────────────────────────────────────
router.get("/superadmin/admins", superAdminOnly, async (_req, res) => {
  const admins = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
    role: usersTable.role, isActive: usersTable.isActive,
    isArchived: usersTable.isArchived, createdAt: usersTable.createdAt,
  }).from(usersTable)
    .where(or(eq(usersTable.role, "admin"), eq(usersTable.role, "super_admin")))
    .orderBy(desc(usersTable.createdAt));
  res.json(admins);
});

// ── Get/Set Admin Permissions ────────────────────────────────────────────────
router.get("/superadmin/admins/:id/permissions", superAdminOnly, async (req, res) => {
  const userId = parseInt(String(req.params.id), 10);
  const perms = await db.select().from(adminPermissionsTable)
    .where(eq(adminPermissionsTable.userId, userId));

  // Ensure all modules present in response
  const permMap = new Map(perms.map(p => [p.module, p]));
  const result = ALL_MODULES.map(m => permMap.get(m) ?? {
    id: null, userId, module: m, canView: false, canCreate: false, canEdit: false, canArchive: false,
  });
  res.json(result);
});

router.put("/superadmin/admins/:id/permissions", superAdminOnly, async (req, res) => {
  const userId = parseInt(String(req.params.id), 10);
  const permissions: { module: string; canView: boolean; canCreate: boolean; canEdit: boolean; canArchive: boolean }[] = req.body;
  if (!Array.isArray(permissions)) { res.status(400).json({ error: "Expected array" }); return; }

  // Prevent touching super_admin users
  const [target] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target.role === "super_admin") { res.status(403).json({ error: "Cannot modify super_admin permissions" }); return; }

  // Delete existing and reinsert
  await db.delete(adminPermissionsTable).where(eq(adminPermissionsTable.userId, userId));
  if (permissions.length > 0) {
    await db.insert(adminPermissionsTable).values(
      permissions.map(p => ({ userId, module: p.module, canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canArchive: p.canArchive }))
    );
  }

  await logFromReq({ req, action: "permissions_updated", actionLabel: `Updated permissions for admin #${userId}`, category: "system", module: "Settings", targetType: "user", targetId: userId, targetName: `Admin #${userId}` });

  res.json({ ok: true });
});

// ── Archive Admin (not super_admin) ─────────────────────────────────────────
router.patch("/superadmin/admins/:id/archive", superAdminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "Not found" }); return; }
  if (target.role === "super_admin") { res.status(403).json({ error: "Super admins cannot be archived" }); return; }

  await db.update(usersTable).set({ isArchived: true, archivedAt: new Date(), archivedBy: req.authUser!.id, isActive: false }).where(eq(usersTable.id, id));
  await logFromReq({ req, action: "admin_archived", actionLabel: `Archived admin ${target.name}`, category: "system", module: "Users", targetType: "user", targetId: id, targetName: target.name });
  res.json({ ok: true });
});

// ── Impersonate ──────────────────────────────────────────────────────────────
router.post("/superadmin/impersonate/:id", superAdminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const [target] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target.role === "super_admin") { res.status(403).json({ error: "Cannot impersonate super admin" }); return; }

  const token = generateToken(target.id);
  await logFromReq({ req, action: "impersonation_started", actionLabel: `Impersonating ${target.name} (${target.role})`, category: "system", module: "Settings", targetType: "user", targetId: target.id, targetName: target.name });
  res.json({ token, userId: target.id, userName: target.name, role: target.role });
});

// ── Recycle Bin ──────────────────────────────────────────────────────────────
const RECYCLE_TYPES = ["user", "course", "announcement", "homework", "test", "banner", "live_class"] as const;
type RecycleType = (typeof RECYCLE_TYPES)[number];

router.get("/superadmin/recycle-bin", superAdminOnly, async (req, res) => {
  const type = (req.query.type as RecycleType) || "user";

  let rows: unknown[] = [];
  if (type === "user") {
    rows = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, archivedAt: usersTable.archivedAt, archivedBy: usersTable.archivedBy })
      .from(usersTable).where(eq(usersTable.isArchived, true)).orderBy(desc(usersTable.archivedAt)).limit(200);
  } else if (type === "course") {
    rows = await db.select({ id: coursesTable.id, name: coursesTable.title, archivedAt: coursesTable.archivedAt, archivedBy: coursesTable.archivedBy })
      .from(coursesTable).where(eq(coursesTable.isArchived, true)).orderBy(desc(coursesTable.archivedAt)).limit(200);
  } else if (type === "announcement") {
    rows = await db.select({ id: announcementsTable.id, name: announcementsTable.title, archivedAt: announcementsTable.archivedAt, archivedBy: announcementsTable.archivedBy })
      .from(announcementsTable).where(eq(announcementsTable.isArchived, true)).orderBy(desc(announcementsTable.archivedAt)).limit(200);
  } else if (type === "homework") {
    rows = await db.select({ id: homeworkTable.id, name: homeworkTable.title, archivedAt: homeworkTable.archivedAt, archivedBy: homeworkTable.archivedBy })
      .from(homeworkTable).where(eq(homeworkTable.isArchived, true)).orderBy(desc(homeworkTable.archivedAt)).limit(200);
  } else if (type === "test") {
    rows = await db.select({ id: testsTable.id, name: testsTable.title, archivedAt: testsTable.archivedAt, archivedBy: testsTable.archivedBy })
      .from(testsTable).where(eq(testsTable.isArchived, true)).orderBy(desc(testsTable.archivedAt)).limit(200);
  } else if (type === "banner") {
    rows = await db.select({ id: bannersTable.id, name: bannersTable.title, archivedAt: bannersTable.archivedAt, archivedBy: bannersTable.archivedBy })
      .from(bannersTable).where(eq(bannersTable.isArchived, true)).orderBy(desc(bannersTable.archivedAt)).limit(200);
  } else if (type === "live_class") {
    rows = await db.select({ id: liveClassesTable.id, name: liveClassesTable.title, archivedAt: liveClassesTable.archivedAt, archivedBy: liveClassesTable.archivedBy })
      .from(liveClassesTable).where(eq(liveClassesTable.isArchived, true)).orderBy(desc(liveClassesTable.archivedAt)).limit(200);
  }

  res.json(rows);
});

router.post("/superadmin/recycle-bin/restore", superAdminOnly, async (req, res) => {
  const { type, id } = req.body as { type: RecycleType; id: number };
  if (!type || !id) { res.status(400).json({ error: "type and id required" }); return; }

  let name = String(id);
  if (type === "user") {
    const [r] = await db.update(usersTable).set({ isArchived: false, archivedAt: null, archivedBy: null, isActive: true }).where(eq(usersTable.id, id)).returning({ name: usersTable.name });
    name = r?.name ?? name;
  } else if (type === "course") {
    const [r] = await db.update(coursesTable).set({ isArchived: false, archivedAt: null, archivedBy: null }).where(eq(coursesTable.id, id)).returning({ name: coursesTable.title });
    name = r?.name ?? name;
  } else if (type === "announcement") {
    const [r] = await db.update(announcementsTable).set({ isArchived: false, archivedAt: null, archivedBy: null }).where(eq(announcementsTable.id, id)).returning({ name: announcementsTable.title });
    name = r?.name ?? name;
  } else if (type === "homework") {
    const [r] = await db.update(homeworkTable).set({ isArchived: false, archivedAt: null, archivedBy: null }).where(eq(homeworkTable.id, id)).returning({ name: homeworkTable.title });
    name = r?.name ?? name;
  } else if (type === "test") {
    const [r] = await db.update(testsTable).set({ isArchived: false, archivedAt: null, archivedBy: null }).where(eq(testsTable.id, id)).returning({ name: testsTable.title });
    name = r?.name ?? name;
  } else if (type === "banner") {
    const [r] = await db.update(bannersTable).set({ isArchived: false, archivedAt: null, archivedBy: null }).where(eq(bannersTable.id, id)).returning({ name: bannersTable.title });
    name = r?.name ?? name;
  } else if (type === "live_class") {
    const [r] = await db.update(liveClassesTable).set({ isArchived: false, archivedAt: null, archivedBy: null }).where(eq(liveClassesTable.id, id)).returning({ name: liveClassesTable.title });
    name = r?.name ?? name;
  }

  await logFromReq({ req, action: "record_restored", actionLabel: `Restored ${type} "${name}"`, category: "system", module: "Settings", targetType: type, targetId: id, targetName: name });
  res.json({ ok: true, name });
});

// ── Rich Audit Logs ──────────────────────────────────────────────────────────
router.get("/superadmin/audit-logs", superAdminOnly, async (req, res) => {
  const {
    dateFrom, dateTo, role, userId, category, module: mod,
    action, targetName, page = "1", limit: lim = "50",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(lim, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (dateFrom) conditions.push(gte(auditLogsTable.createdAt, new Date(dateFrom)));
  if (dateTo) {
    const to = new Date(dateTo);
    to.setDate(to.getDate() + 1);
    conditions.push(lte(auditLogsTable.createdAt, to));
  }
  if (role) {
    // actorRole is NULL on all legacy logs — match via actorId lookup in users table
    const actorsWithRole = (await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.role, role))).map(u => u.id);
    if (actorsWithRole.length > 0) {
      conditions.push(or(eq(auditLogsTable.actorRole, role), inArray(auditLogsTable.actorId, actorsWithRole))!);
    } else {
      conditions.push(eq(auditLogsTable.actorRole, role));
    }
  }
  if (userId) conditions.push(eq(auditLogsTable.actorId, parseInt(userId, 10)));
  if (category) conditions.push(eq(auditLogsTable.category, category));
  if (mod) {
    // module column is NULL on all legacy logs — derive from targetType instead
    const moduleToTargetTypes: Record<string, string[]> = {
      "Courses": ["course"],
      "Users": ["user"],
      "Live Classes": ["live_class"],
      "Homework": ["homework"],
      "Tests": ["test"],
      "Assignments": ["assignment"],
      "Announcements": ["announcement"],
      "Banners": ["banner"],
      "Teachers": ["teacher_course", "teacher"],
      "Enrollments": ["enrollment"],
      "Settings": ["settings"],
      "BTL CRM": ["follow_up", "demo_batch", "demo_session"],
      "Staff Attendance": ["checkin"],
    };
    const targetTypes = moduleToTargetTypes[mod];
    if (targetTypes && targetTypes.length > 0) {
      conditions.push(or(
        eq(auditLogsTable.module, mod),
        inArray(auditLogsTable.targetType, targetTypes),
      )!);
    } else {
      conditions.push(eq(auditLogsTable.module, mod));
    }
  }
  if (action) conditions.push(ilike(auditLogsTable.action, `%${action}%`));
  if (targetName) conditions.push(ilike(auditLogsTable.targetName, `%${targetName}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, [{ total }]] = await Promise.all([
    db.select().from(auditLogsTable)
      .where(where)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(auditLogsTable).where(where),
  ]);

  res.json({ logs, total: Number(total), page: pageNum, limit: limitNum, pages: Math.ceil(Number(total) / limitNum) });
});

// ── Student Timeline (read) ──────────────────────────────────────────────────
router.get("/superadmin/student-timeline/:studentId", superAdminOnly, async (req, res) => {
  const studentId = parseInt(String(req.params.studentId), 10);
  const logs = await db.select().from(auditLogsTable)
    .where(and(eq(auditLogsTable.targetType, "student"), eq(auditLogsTable.targetId, studentId)))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(500);
  res.json(logs);
});

// ── Revert a change ──────────────────────────────────────────────────────────
router.post("/superadmin/audit-logs/:id/revert", superAdminOnly, async (req, res) => {
  const logId = parseInt(String(req.params.id), 10);
  const [log] = await db.select().from(auditLogsTable).where(eq(auditLogsTable.id, logId)).limit(1);
  if (!log) { res.status(404).json({ error: "Log entry not found" }); return; }
  if (!log.beforeValue) { res.status(400).json({ error: "No before value to revert to" }); return; }

  const before = log.beforeValue as Record<string, unknown>;

  // Apply revert based on targetType
  let reverted = false;
  if (log.targetType === "user" && log.targetId) {
    const allowed: (keyof typeof usersTable.$inferInsert)[] = ["name", "phone", "email", "school", "grade", "parentName", "parentPhone", "leadStage"];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in before) patch[k] = before[k];
    if (Object.keys(patch).length > 0) {
      await db.update(usersTable).set({
        name: patch.name as string | undefined,
        phone: patch.phone as string | undefined,
        email: patch.email as string | undefined,
        school: patch.school as string | undefined,
        grade: patch.grade as number | undefined,
        parentName: patch.parentName as string | undefined,
        parentPhone: patch.parentPhone as string | undefined,
        leadStage: patch.leadStage as string | undefined,
      }).where(eq(usersTable.id, log.targetId!));
      reverted = true;
    }
  }

  if (!reverted) { res.status(400).json({ error: "Revert not supported for this record type" }); return; }

  await logFromReq({ req, action: "change_reverted", actionLabel: `Reverted change on ${log.targetType} "${log.targetName}"`, category: "system", module: "Audit Logs", targetType: log.targetType, targetId: log.targetId, targetName: log.targetName, after: before, before: log.afterValue as Record<string, unknown> ?? undefined });

  res.json({ ok: true });
});

export default router;
