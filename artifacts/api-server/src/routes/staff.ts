import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, employeeCheckinsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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

// ── Check-in / Check-out ───────────────────────────────────────────────────

function todayIST(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

router.get("/staff/checkin/today", staffAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const today = todayIST();
  const [record] = await db.select().from(employeeCheckinsTable)
    .where(and(eq(employeeCheckinsTable.userId, userId), eq(employeeCheckinsTable.checkDate, today)))
    .limit(1);
  res.json(record ?? null);
});

router.post("/staff/checkin", staffAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const today = todayIST();
  const [existing] = await db.select().from(employeeCheckinsTable)
    .where(and(eq(employeeCheckinsTable.userId, userId), eq(employeeCheckinsTable.checkDate, today)))
    .limit(1);
  if (existing) { res.json(existing); return; }
  const ua = req.headers["user-agent"] ?? "";
  const browser = ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Other";
  const [record] = await db.insert(employeeCheckinsTable).values({
    userId,
    checkDate: today,
    checkInTime: new Date(),
    device: "Web",
    browser,
  }).returning();
  res.json(record);
});

router.patch("/staff/checkin/checkout", staffAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const today = todayIST();
  const [existing] = await db.select().from(employeeCheckinsTable)
    .where(and(eq(employeeCheckinsTable.userId, userId), eq(employeeCheckinsTable.checkDate, today)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "No check-in found for today" }); return; }
  if (existing.checkOutTime) { res.json(existing); return; }
  const { workSummary, challenges, pendingTasks, tomorrowPriorities } = req.body ?? {};
  const [updated] = await db.update(employeeCheckinsTable).set({
    checkOutTime: new Date(),
    workSummary: workSummary ?? null,
    challenges: challenges ?? null,
    pendingTasks: pendingTasks ?? null,
    tomorrowPriorities: tomorrowPriorities ?? null,
    updatedAt: new Date(),
  }).where(eq(employeeCheckinsTable.id, existing.id)).returning();
  res.json(updated);
});

// Get last 30 days of checkins for the logged-in staff member
router.get("/staff/checkin/history", staffAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const records = await db.select().from(employeeCheckinsTable)
    .where(eq(employeeCheckinsTable.userId, userId))
    .orderBy(employeeCheckinsTable.checkDate);
  res.json(records.slice(-30).reverse());
});

export default router;
