import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const staffAuth = requireRole("admin", "teacher", "mentor");

router.get("/staff/me", staffAuth, async (req, res) => {
  const id = req.authUser!.id;
  const [user] = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    phone: usersTable.phone,
    role: usersTable.role,
    avatarUrl: usersTable.avatarUrl,
    school: usersTable.school,
  }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.patch("/staff/me", staffAuth, async (req, res) => {
  const id = req.authUser!.id;
  const { name, avatarUrl, school } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) { res.status(400).json({ error: "Name cannot be empty." }); return; }
    updates.name = trimmed;
  }
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl || null;
  if (school !== undefined) updates.school = school || null;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    phone: usersTable.phone,
    role: usersTable.role,
    avatarUrl: usersTable.avatarUrl,
    school: usersTable.school,
  });
  res.json(updated);
});

export default router;
