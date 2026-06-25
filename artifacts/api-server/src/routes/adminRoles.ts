import { Router } from "express";
import { db } from "@workspace/db";
import {
  rolesTable, rbacPermissionsTable, rolePermissionsTable,
  usersTable, auditLogsTable,
  RBAC_MODULES, RBAC_ACTIONS,
} from "@workspace/db";
import { requireRole } from "../middlewares/auth.js";
import { eq, and, count, desc, inArray, asc } from "drizzle-orm";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

// ── Audit helper ──────────────────────────────────────────────────────────────
async function logRoleAction(opts: {
  actorId: number; actorName: string; actorRole: string;
  action: string; actionLabel: string;
  targetId: number; targetName: string;
  beforeValue?: unknown; afterValue?: unknown;
}) {
  try {
    await db.insert(auditLogsTable).values({
      actorId: opts.actorId, actorName: opts.actorName, actorRole: opts.actorRole,
      action: opts.action, actionLabel: opts.actionLabel,
      category: "staff", module: "roles",
      targetType: "role", targetId: opts.targetId, targetName: opts.targetName,
      beforeValue: opts.beforeValue ?? null, afterValue: opts.afterValue ?? null,
    });
  } catch (_) { /* non-fatal */ }
}

// ── Seed all module×action permission rows if missing ─────────────────────────
async function ensurePermissionsSeeded() {
  const existing = await db.select({ module: rbacPermissionsTable.module, action: rbacPermissionsTable.action }).from(rbacPermissionsTable);
  const existingSet = new Set(existing.map(r => `${r.module}|${r.action}`));
  const toInsert = [];
  for (const mod of RBAC_MODULES) {
    for (const act of RBAC_ACTIONS) {
      if (!existingSet.has(`${mod}|${act}`)) {
        toInsert.push({ module: mod, action: act, description: `${act} on ${mod}` });
      }
    }
  }
  if (toInsert.length > 0) {
    await db.insert(rbacPermissionsTable).values(toInsert).onConflictDoNothing();
  }
}

// ── Seed system roles if missing ──────────────────────────────────────────────
const SYSTEM_ROLES = [
  { name: "super_admin",        description: "Full unrestricted access to the entire platform" },
  { name: "admin",              description: "Full admin access, except super-admin-only actions" },
  { name: "manager",            description: "Manages staff and key operations" },
  { name: "assistant_manager",  description: "Supports manager-level operations" },
  { name: "sales_mentor",       description: "Handles student conversion and sales follow-ups" },
  { name: "academic_mentor",    description: "Provides academic guidance to assigned students" },
  { name: "teacher",            description: "Creates and delivers content, classes, and assessments" },
  { name: "student",            description: "Standard student access to learning content" },
];

async function ensureSystemRoles() {
  const existing = await db.select({ name: rolesTable.name }).from(rolesTable);
  const existingNames = new Set(existing.map(r => r.name));
  const toInsert = SYSTEM_ROLES.filter(r => !existingNames.has(r.name)).map(r => ({ ...r, isSystem: true }));
  if (toInsert.length > 0) {
    await db.insert(rolesTable).values(toInsert).onConflictDoNothing();
  }
}

// ── GET /admin/roles ──────────────────────────────────────────────────────────
router.get("/admin/roles", adminOnly, async (req, res) => {
  try {
    await ensureSystemRoles();
    await ensurePermissionsSeeded();

    const roles = await db.select().from(rolesTable).orderBy(asc(rolesTable.id));

    // Count users per role (by role text column on users)
    const userCounts = await db.select({ role: usersTable.role, cnt: count() })
      .from(usersTable).groupBy(usersTable.role);
    const countMap = new Map(userCounts.map(r => [r.role, r.cnt]));

    // Count permissions per role
    const permCounts = await db.select({ roleId: rolePermissionsTable.roleId, cnt: count() })
      .from(rolePermissionsTable).groupBy(rolePermissionsTable.roleId);
    const permMap = new Map(permCounts.map(r => [r.roleId, r.cnt]));

    const items = roles.map(r => ({
      ...r,
      usersCount: countMap.get(r.name) ?? 0,
      permissionsCount: permMap.get(r.id) ?? 0,
    }));

    res.json({ items, total: roles.length });
  } catch (err) {
    req.log.error({ err }, "roles list error");
    res.status(500).json({ error: "Failed to list roles" });
  }
});

// ── GET /admin/roles/:id ──────────────────────────────────────────────────────
router.get("/admin/roles/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, id)).limit(1);
    if (!role) { res.status(404).json({ error: "Role not found" }); return; }

    // Permissions for this role
    const perms = await db.select({ module: rbacPermissionsTable.module, action: rbacPermissionsTable.action })
      .from(rolePermissionsTable)
      .innerJoin(rbacPermissionsTable, eq(rbacPermissionsTable.id, rolePermissionsTable.permissionId))
      .where(eq(rolePermissionsTable.roleId, id));

    // Build a module → Set<action> map
    const matrix: Record<string, Record<string, boolean>> = {};
    for (const mod of RBAC_MODULES) {
      matrix[mod] = {};
      for (const act of RBAC_ACTIONS) matrix[mod][act] = false;
    }
    for (const p of perms) {
      if (matrix[p.module]) matrix[p.module][p.action] = true;
    }

    // Assigned users
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, isActive: usersTable.isActive })
      .from(usersTable).where(eq(usersTable.role, role.name)).limit(50);

    // Audit activity
    const activity = await db.select({
      id: auditLogsTable.id, action: auditLogsTable.action, actionLabel: auditLogsTable.actionLabel,
      actorName: auditLogsTable.actorName, targetName: auditLogsTable.targetName, createdAt: auditLogsTable.createdAt,
    }).from(auditLogsTable)
      .where(and(eq(auditLogsTable.module, "roles"), eq(auditLogsTable.targetId, id)))
      .orderBy(desc(auditLogsTable.createdAt)).limit(20);

    res.json({ role, matrix, users, activity });
  } catch (err) {
    req.log.error({ err }, "role detail error");
    res.status(500).json({ error: "Failed to load role" });
  }
});

// ── GET /admin/permissions ────────────────────────────────────────────────────
router.get("/admin/permissions", adminOnly, async (req, res) => {
  try {
    await ensurePermissionsSeeded();
    const perms = await db.select().from(rbacPermissionsTable).orderBy(asc(rbacPermissionsTable.module), asc(rbacPermissionsTable.action));
    res.json({ items: perms, modules: RBAC_MODULES, actions: RBAC_ACTIONS });
  } catch (err) {
    req.log.error({ err }, "permissions list error");
    res.status(500).json({ error: "Failed to list permissions" });
  }
});

// ── POST /admin/roles ─────────────────────────────────────────────────────────
router.post("/admin/roles", adminOnly, async (req, res) => {
  const { name, description, cloneFromId } = req.body as { name?: string; description?: string; cloneFromId?: number };
  if (!name?.trim()) { res.status(400).json({ error: "Role name is required" }); return; }

  try {
    const [newRole] = await db.insert(rolesTable).values({ name: name.trim(), description: description?.trim() || null, isSystem: false }).returning();

    if (cloneFromId) {
      // Copy permissions from source role
      const sourcePerm = await db.select({ permissionId: rolePermissionsTable.permissionId })
        .from(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, cloneFromId));
      if (sourcePerm.length > 0) {
        await db.insert(rolePermissionsTable)
          .values(sourcePerm.map(p => ({ roleId: newRole.id, permissionId: p.permissionId })))
          .onConflictDoNothing();
      }
    }

    const actor = req.authUser!;
    await logRoleAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: cloneFromId ? "role_cloned" : "role_created",
      actionLabel: cloneFromId ? "Cloned Role" : "Created Role",
      targetId: newRole.id, targetName: newRole.name,
      afterValue: newRole,
    });

    res.status(201).json({ success: true, role: newRole });
  } catch (err: any) {
    if (err?.code === "23505") { res.status(409).json({ error: "A role with this name already exists" }); return; }
    req.log.error({ err }, "create role error");
    res.status(500).json({ error: "Failed to create role" });
  }
});

// ── PATCH /admin/roles/:id ────────────────────────────────────────────────────
router.patch("/admin/roles/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, description, isActive } = req.body as { name?: string; description?: string; isActive?: boolean };
  try {
    const [before] = await db.select().from(rolesTable).where(eq(rolesTable.id, id)).limit(1);
    if (!before) { res.status(404).json({ error: "Role not found" }); return; }

    const updates: Partial<typeof rolesTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined && name.trim())   updates.name        = name.trim();
    if (description !== undefined)           updates.description = description || null;
    if (isActive !== undefined && !before.isSystem) updates.isActive = isActive;

    const [updated] = await db.update(rolesTable).set(updates).where(eq(rolesTable.id, id)).returning();

    const actor = req.authUser!;
    await logRoleAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "role_updated", actionLabel: "Updated Role",
      targetId: id, targetName: before.name, beforeValue: before, afterValue: updated,
    });

    res.json({ success: true, role: updated });
  } catch (err) {
    req.log.error({ err }, "update role error");
    res.status(500).json({ error: "Failed to update role" });
  }
});

// ── POST /admin/roles/:id/clone ───────────────────────────────────────────────
router.post("/admin/roles/:id/clone", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, description } = req.body as { name?: string; description?: string };
  if (!name?.trim()) { res.status(400).json({ error: "New role name is required" }); return; }

  try {
    const [source] = await db.select().from(rolesTable).where(eq(rolesTable.id, id)).limit(1);
    if (!source) { res.status(404).json({ error: "Source role not found" }); return; }

    const [newRole] = await db.insert(rolesTable).values({
      name: name.trim(),
      description: description?.trim() || `Cloned from ${source.name}`,
      isSystem: false,
    }).returning();

    const sourcePerm = await db.select({ permissionId: rolePermissionsTable.permissionId })
      .from(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, id));
    if (sourcePerm.length > 0) {
      await db.insert(rolePermissionsTable)
        .values(sourcePerm.map(p => ({ roleId: newRole.id, permissionId: p.permissionId })))
        .onConflictDoNothing();
    }

    const actor = req.authUser!;
    await logRoleAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "role_cloned", actionLabel: "Cloned Role",
      targetId: newRole.id, targetName: newRole.name,
      beforeValue: { clonedFrom: source.name }, afterValue: newRole,
    });

    res.status(201).json({ success: true, role: newRole });
  } catch (err: any) {
    if (err?.code === "23505") { res.status(409).json({ error: "A role with this name already exists" }); return; }
    req.log.error({ err }, "clone role error");
    res.status(500).json({ error: "Failed to clone role" });
  }
});

// ── POST /admin/permissions/update ────────────────────────────────────────────
// Body: { roleId, module, action, granted: boolean }
router.post("/admin/permissions/update", adminOnly, async (req, res) => {
  const { roleId, module: mod, action, granted } = req.body as {
    roleId: number; module: string; action: string; granted: boolean;
  };
  if (!roleId || !mod || !action) { res.status(400).json({ error: "roleId, module, and action are required" }); return; }

  try {
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId)).limit(1);
    if (!role) { res.status(404).json({ error: "Role not found" }); return; }

    // Guard: super_admin always has full access — block any removal
    if (role.name === "super_admin") {
      res.status(403).json({ error: "Super admin permissions cannot be modified" }); return;
    }

    const [perm] = await db.select().from(rbacPermissionsTable)
      .where(and(eq(rbacPermissionsTable.module, mod), eq(rbacPermissionsTable.action, action))).limit(1);
    if (!perm) { res.status(404).json({ error: "Permission not found" }); return; }

    if (granted) {
      await db.insert(rolePermissionsTable).values({ roleId, permissionId: perm.id }).onConflictDoNothing();
    } else {
      await db.delete(rolePermissionsTable)
        .where(and(eq(rolePermissionsTable.roleId, roleId), eq(rolePermissionsTable.permissionId, perm.id)));
    }

    const actor = req.authUser!;
    await logRoleAction({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "permission_updated", actionLabel: "Updated Permission",
      targetId: role.id, targetName: role.name,
      beforeValue: { module: mod, action, granted: !granted },
      afterValue: { module: mod, action, granted },
    });

    res.json({ success: true, roleId, module: mod, action, granted });
  } catch (err) {
    req.log.error({ err }, "permission update error");
    res.status(500).json({ error: "Failed to update permission" });
  }
});

export default router;
