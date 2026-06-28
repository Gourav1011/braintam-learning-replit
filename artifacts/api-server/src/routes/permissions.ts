import { Router } from "express";
import { db } from "@workspace/db";
import { adminPermissionsTable, ALL_MODULES } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();

/**
 * Any staff member can fetch their own permissions.
 * Admin/super_admin can fetch anyone's.
 */
router.get("/permissions/me", requireRole("admin", "super_admin", "teacher", "mentor", "sales_mentor", "academic_mentor"), async (req, res) => {
  const userId = req.authUser!.id;
  const role = req.authUser!.role;

  // Super admin has all permissions
  if (role === "super_admin") {
    const all = ALL_MODULES.map(m => ({ userId, module: m, canView: true, canCreate: true, canEdit: true, canArchive: true }));
    res.json(all); return;
  }

  // Admin: check DB
  if (role === "admin") {
    const perms = await db.select().from(adminPermissionsTable).where(eq(adminPermissionsTable.userId, userId));
    const permMap = new Map(perms.map(p => [p.module, p]));
    const result = ALL_MODULES.map(m => permMap.get(m) ?? { userId, module: m, canView: false, canCreate: false, canEdit: false, canArchive: false });
    res.json(result); return;
  }

  // Teacher/mentor: return empty (they have their own portals)
  res.json([]);
});

export default router;
