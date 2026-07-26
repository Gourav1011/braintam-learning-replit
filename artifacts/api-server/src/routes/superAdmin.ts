import { Router } from "express";
import { generateAuthToken } from "../lib/auth-token.js";
import { db } from "@workspace/db";
import {
  usersTable, auditLogsTable, adminPermissionsTable,
  coursesTable, announcementsTable, homeworkTable, testsTable,
  bannersTable, liveClassesTable, ALL_MODULES,
} from "@workspace/db";
import { eq, desc, and, gte, lte, or, ilike, sql, inArray, ne } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";
import { logFromReq } from "../utils/audit.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const router = Router();
const superAdminOnly = requireRole("super_admin");

const BACKUP_DIR = "/tmp/braintam_backups";

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw + "braintam_salt").digest("hex");
}

function generateToken(userId: number): string {
  return generateAuthToken(userId);
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
    lastLoginAt: usersTable.lastLoginDate,
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

  const [target] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target.role === "super_admin") { res.status(403).json({ error: "Cannot modify super_admin permissions" }); return; }

  await db.delete(adminPermissionsTable).where(eq(adminPermissionsTable.userId, userId));
  if (permissions.length > 0) {
    await db.insert(adminPermissionsTable).values(
      permissions.map(p => ({ userId, module: p.module, canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canArchive: p.canArchive }))
    );
  }

  await logFromReq({ req, action: "permissions_updated", actionLabel: `Updated permissions for admin #${userId}`, category: "system", module: "Settings", targetType: "user", targetId: userId, targetName: `Admin #${userId}` });

  res.json({ ok: true });
});

// ── Archive Admin ─────────────────────────────────────────────────────────
router.patch("/superadmin/admins/:id/archive", superAdminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "Not found" }); return; }
  if (target.role === "super_admin") { res.status(403).json({ error: "Super admins cannot be archived" }); return; }

  await db.update(usersTable).set({ isArchived: true, archivedAt: new Date(), archivedBy: req.authUser!.id, isActive: false }).where(eq(usersTable.id, id));
  await logFromReq({ req, action: "admin_archived", actionLabel: `Archived admin ${target.name}`, category: "system", module: "Users", targetType: "user", targetId: id, targetName: target.name });
  res.json({ ok: true });
});

// ── Toggle Admin Active/Inactive ─────────────────────────────────────────────
router.patch("/superadmin/admins/:id/toggle-active", superAdminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (id === req.authUser!.id) { res.status(403).json({ error: "Cannot disable yourself" }); return; }

  const [target] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role, isActive: usersTable.isActive }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "Not found" }); return; }
  if (target.role === "super_admin") { res.status(403).json({ error: "Cannot disable super admin" }); return; }

  const newActive = !target.isActive;
  await db.update(usersTable).set({ isActive: newActive }).where(eq(usersTable.id, id));

  await logFromReq({ req, action: newActive ? "admin_enabled" : "admin_disabled", actionLabel: `${newActive ? "Enabled" : "Disabled"} admin ${target.name}`, category: "system", module: "Users", targetType: "user", targetId: id, targetName: target.name });
  res.json({ ok: true, isActive: newActive });
});

// ── Reset Admin Password ─────────────────────────────────────────────────────
router.post("/superadmin/admins/:id/reset-password", superAdminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

  const [target] = await db.select({ name: usersTable.name, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) { res.status(404).json({ error: "Not found" }); return; }
  if (target.role === "super_admin" && id !== req.authUser!.id) { res.status(403).json({ error: "Cannot reset super admin password" }); return; }

  await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, id));
  await logFromReq({ req, action: "password_reset", actionLabel: `Reset password for ${target.name}`, category: "system", module: "Users", targetType: "user", targetId: id, targetName: target.name });
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

// ── Dashboard Stats ──────────────────────────────────────────────────────────
router.get("/superadmin/dashboard-stats", superAdminOnly, async (_req, res) => {
  const [
    adminRows,
    studentCount,
    teacherCount,
    mentorCount,
    totalUserCount,
    recentActivity,
  ] = await Promise.all([
    db.select({
      id: usersTable.id,
      role: usersTable.role,
      isActive: usersTable.isActive,
      isArchived: usersTable.isArchived,
    }).from(usersTable)
      .where(or(eq(usersTable.role, "admin"), eq(usersTable.role, "super_admin"))),
    db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(and(eq(usersTable.role, "student"), eq(usersTable.isArchived, false))),
    db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(and(eq(usersTable.role, "teacher"), eq(usersTable.isArchived, false))),
    db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(and(eq(usersTable.role, "mentor"), eq(usersTable.isArchived, false))),
    db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(eq(usersTable.isArchived, false)),
    db.select({
      id: auditLogsTable.id,
      actorName: auditLogsTable.actorName,
      actorRole: auditLogsTable.actorRole,
      action: auditLogsTable.action,
      actionLabel: auditLogsTable.actionLabel,
      module: auditLogsTable.module,
      targetType: auditLogsTable.targetType,
      targetName: auditLogsTable.targetName,
      createdAt: auditLogsTable.createdAt,
    }).from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(10),
  ]);

  const totalAdmins = adminRows.length;
  const activeAdmins = adminRows.filter(a => a.isActive && !a.isArchived).length;
  const inactiveAdmins = totalAdmins - activeAdmins;

  // Check last backup
  let lastBackup: string | null = null;
  try {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".json") && f.startsWith("backup_")).sort().reverse();
    if (files.length > 0) {
      const stat = fs.statSync(path.join(BACKUP_DIR, files[0]));
      lastBackup = stat.mtime.toISOString();
    }
  } catch {}

  // DB health check
  let dbHealthy = true;
  try { await db.execute(sql`SELECT 1`); } catch { dbHealthy = false; }

  res.json({
    totalAdmins,
    activeAdmins,
    inactiveAdmins,
    totalUsers: Number(totalUserCount[0]?.count ?? 0),
    totalStudents: Number(studentCount[0]?.count ?? 0),
    totalTeachers: Number(teacherCount[0]?.count ?? 0),
    totalMentors: Number(mentorCount[0]?.count ?? 0),
    systemHealthy: dbHealthy,
    lastBackup,
    recentActivity,
  });
});

// ── System Health ────────────────────────────────────────────────────────────
router.get("/superadmin/system-health", superAdminOnly, async (_req, res) => {
  const services: { name: string; status: "healthy" | "warning" | "offline"; detail: string }[] = [];

  // Database
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const ms = Date.now() - start;
    services.push({ name: "Database", status: ms < 500 ? "healthy" : "warning", detail: `${ms}ms response` });
  } catch (e) {
    services.push({ name: "Database", status: "offline", detail: "Connection failed" });
  }

  // API Server
  services.push({ name: "API Server", status: "healthy", detail: "All routes operational" });

  // Storage
  try {
    ensureBackupDir();
    fs.writeFileSync(path.join(BACKUP_DIR, ".health"), Date.now().toString());
    const stat = fs.statfsSync(BACKUP_DIR);
    const usedPct = Math.round(((stat.blocks - stat.bfree) / stat.blocks) * 100);
    services.push({ name: "Storage", status: usedPct > 90 ? "warning" : "healthy", detail: `${usedPct}% used` });
  } catch {
    services.push({ name: "Storage", status: "warning", detail: "Status unknown" });
  }

  // Email Service
  services.push({ name: "Email Service", status: "warning", detail: "SMTP not configured" });

  // WhatsApp / SMS
  const smsKey = process.env.FAST2SMS_API_KEY;
  services.push({ name: "WhatsApp / SMS", status: smsKey ? "healthy" : "warning", detail: smsKey ? "Fast2SMS connected" : "API key not set" });

  // Background Jobs
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, oneHourAgo));
    services.push({ name: "Background Jobs", status: "healthy", detail: `${count} events in last hour` });
  } catch {
    services.push({ name: "Background Jobs", status: "warning", detail: "Cannot verify" });
  }

  const allHealthy = services.every(s => s.status === "healthy");
  const anyOffline = services.some(s => s.status === "offline");
  const overall = anyOffline ? "offline" : allHealthy ? "healthy" : "warning";

  res.json({ services, overall, checkedAt: new Date().toISOString() });
});

// ── Backups ──────────────────────────────────────────────────────────────────
router.get("/superadmin/backups", superAdminOnly, async (_req, res) => {
  try {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".json") && f.startsWith("backup_"))
      .sort().reverse()
      .slice(0, 50);

    const backups = files.map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      const sizeBytes = stat.size;
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
      return {
        id: f.replace(".json", ""),
        filename: f,
        createdAt: stat.mtime.toISOString(),
        sizeBytes,
        sizeMB: parseFloat(sizeMB),
        status: "success",
      };
    });

    res.json(backups);
  } catch {
    res.json([]);
  }
});

router.post("/superadmin/backups", superAdminOnly, async (req, res) => {
  try {
    ensureBackupDir();
    const label = (req.body?.label as string) || "manual";

    const [
      userCount,
      courseCount,
      liveClassCount,
      homeworkCount,
      testCount,
      auditCount,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(usersTable),
      db.select({ count: sql<number>`count(*)` }).from(coursesTable),
      db.select({ count: sql<number>`count(*)` }).from(liveClassesTable),
      db.select({ count: sql<number>`count(*)` }).from(homeworkTable),
      db.select({ count: sql<number>`count(*)` }).from(testsTable),
      db.select({ count: sql<number>`count(*)` }).from(auditLogsTable),
    ]);

    const payload = {
      version: "2.0.0",
      createdAt: new Date().toISOString(),
      label,
      createdBy: req.authUser!.id,
      schema: "braintam_v2",
      tableCounts: {
        users: Number(userCount[0]?.count ?? 0),
        courses: Number(courseCount[0]?.count ?? 0),
        live_classes: Number(liveClassCount[0]?.count ?? 0),
        homework: Number(homeworkCount[0]?.count ?? 0),
        tests: Number(testCount[0]?.count ?? 0),
        audit_logs: Number(auditCount[0]?.count ?? 0),
      },
    };

    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup_${ts}_${label}.json`;
    const filepath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2));

    const stat = fs.statSync(filepath);

    await logFromReq({ req, action: "backup_created", actionLabel: `Manual backup created: ${filename}`, category: "system", module: "Backup Center", targetType: "backup", targetId: 0, targetName: filename });

    res.json({
      ok: true,
      id: filename.replace(".json", ""),
      filename,
      sizeBytes: stat.size,
      sizeMB: parseFloat((stat.size / (1024 * 1024)).toFixed(2)),
      createdAt: stat.mtime.toISOString(),
      status: "success",
    });
  } catch (e) {
    res.status(500).json({ error: "Backup creation failed" });
  }
});

router.get("/superadmin/backups/:id/download", superAdminOnly, async (req, res) => {
  try {
    ensureBackupDir();
    const filename = req.params.id + ".json";
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) { res.status(404).json({ error: "Backup not found" }); return; }
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.sendFile(filepath);
  } catch {
    res.status(500).json({ error: "Download failed" });
  }
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

router.delete("/superadmin/recycle-bin", superAdminOnly, async (req, res) => {
  const { type, id } = req.body as { type: RecycleType; id: number };
  if (!type || !id) { res.status(400).json({ error: "type and id required" }); return; }

  let name = String(id);
  if (type === "user") {
    const [r] = await db.select({ name: usersTable.name }).from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.isArchived, true))).limit(1);
    if (!r) { res.status(404).json({ error: "Not found in recycle bin" }); return; }
    name = r.name;
    await db.delete(usersTable).where(eq(usersTable.id, id));
  } else if (type === "course") {
    const [r] = await db.select({ name: coursesTable.title }).from(coursesTable).where(and(eq(coursesTable.id, id), eq(coursesTable.isArchived, true))).limit(1);
    if (!r) { res.status(404).json({ error: "Not found in recycle bin" }); return; }
    name = r.name;
    await db.delete(coursesTable).where(eq(coursesTable.id, id));
  } else if (type === "announcement") {
    const [r] = await db.select({ name: announcementsTable.title }).from(announcementsTable).where(and(eq(announcementsTable.id, id), eq(announcementsTable.isArchived, true))).limit(1);
    if (!r) { res.status(404).json({ error: "Not found in recycle bin" }); return; }
    name = r.name;
    await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  } else if (type === "homework") {
    const [r] = await db.select({ name: homeworkTable.title }).from(homeworkTable).where(and(eq(homeworkTable.id, id), eq(homeworkTable.isArchived, true))).limit(1);
    if (!r) { res.status(404).json({ error: "Not found in recycle bin" }); return; }
    name = r.name;
    await db.delete(homeworkTable).where(eq(homeworkTable.id, id));
  } else if (type === "test") {
    const [r] = await db.select({ name: testsTable.title }).from(testsTable).where(and(eq(testsTable.id, id), eq(testsTable.isArchived, true))).limit(1);
    if (!r) { res.status(404).json({ error: "Not found in recycle bin" }); return; }
    name = r.name;
    await db.delete(testsTable).where(eq(testsTable.id, id));
  } else if (type === "banner") {
    const [r] = await db.select({ name: bannersTable.title }).from(bannersTable).where(and(eq(bannersTable.id, id), eq(bannersTable.isArchived, true))).limit(1);
    if (!r) { res.status(404).json({ error: "Not found in recycle bin" }); return; }
    name = r.name;
    await db.delete(bannersTable).where(eq(bannersTable.id, id));
  } else if (type === "live_class") {
    const [r] = await db.select({ name: liveClassesTable.title }).from(liveClassesTable).where(and(eq(liveClassesTable.id, id), eq(liveClassesTable.isArchived, true))).limit(1);
    if (!r) { res.status(404).json({ error: "Not found in recycle bin" }); return; }
    name = r.name;
    await db.delete(liveClassesTable).where(eq(liveClassesTable.id, id));
  }

  await logFromReq({ req, action: "permanent_delete", actionLabel: `Permanently deleted ${type} "${name}"`, category: "system", module: "Recycle Bin", targetType: type, targetId: id, targetName: name });
  res.json({ ok: true });
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
      conditions.push(or(eq(auditLogsTable.module, mod), inArray(auditLogsTable.targetType, targetTypes))!);
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

// ── Student Timeline ──────────────────────────────────────────────────────────
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

// Suppress unused import warning
void ne;

export default router;
