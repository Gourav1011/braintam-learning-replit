/**
 * hasPermission — central RBAC helper
 *
 * Usage:
 *   const allowed = await hasPermission(userId, "Courses", "create");
 *   if (!allowed) return res.status(403).json({ error: "Forbidden" });
 *
 * Super admin always returns true.
 * Falls back to false if the role has no matching permission row.
 *
 * NOTE: This helper is prepared for future use. Existing modules still use
 * requireRole() guards. Migrate them to hasPermission() in Phase E+.
 */
import { db } from "@workspace/db";
import { usersTable, rolesTable, rolePermissionsTable, rbacPermissionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export async function hasPermission(
  userId: number,
  module: string,
  action: string,
): Promise<boolean> {
  try {
    const [user] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) return false;
    if (user.role === "super_admin") return true;

    // Look up role row
    const [role] = await db
      .select({ id: rolesTable.id })
      .from(rolesTable)
      .where(and(eq(rolesTable.name, user.role), eq(rolesTable.isActive, true)))
      .limit(1);
    if (!role) return false;

    // Check role_permissions → rbac_permissions
    const [perm] = await db
      .select({ id: rbacPermissionsTable.id })
      .from(rolePermissionsTable)
      .innerJoin(rbacPermissionsTable, eq(rbacPermissionsTable.id, rolePermissionsTable.permissionId))
      .where(
        and(
          eq(rolePermissionsTable.roleId, role.id),
          eq(rbacPermissionsTable.module, module),
          eq(rbacPermissionsTable.action, action),
        ),
      )
      .limit(1);

    return !!perm;
  } catch {
    return false;
  }
}
