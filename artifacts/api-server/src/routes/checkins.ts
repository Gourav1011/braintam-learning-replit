import { Router } from "express";
import { db } from "@workspace/db";
import { employeeCheckinsTable, usersTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const staffAuth = requireRole("admin", "teacher", "mentor");

function parseUA(ua: string): { browser: string; device: string } {
  const browser = ua.includes("Edg") ? "Edge" : ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Browser";
  const device = /mobile/i.test(ua) ? "Mobile" : /tablet|ipad/i.test(ua) ? "Tablet" : "Desktop";
  return { browser, device };
}

// ── Today's status ────────────────────────────────────────────────────────
router.get("/staff/checkin/today", staffAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const today = new Date().toISOString().slice(0, 10);
  const [row] = await db.select().from(employeeCheckinsTable)
    .where(and(eq(employeeCheckinsTable.userId, userId), eq(employeeCheckinsTable.checkDate, today))).limit(1);
  res.json(row ?? null);
});

// ── Check In ─────────────────────────────────────────────────────────────
router.post("/staff/checkin", staffAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const today = new Date().toISOString().slice(0, 10);
  const [existing] = await db.select().from(employeeCheckinsTable)
    .where(and(eq(employeeCheckinsTable.userId, userId), eq(employeeCheckinsTable.checkDate, today))).limit(1);
  // Already checked in and not yet checked out — return existing session
  if (existing?.checkInTime && !existing?.checkOutTime) { res.json(existing); return; }

  const { browser, device } = parseUA(req.headers["user-agent"] ?? "");
  const now = new Date();
  if (existing) {
    // Either no checkInTime yet, or user is re-checking-in after a checkout (new session)
    const [row] = await db.update(employeeCheckinsTable).set({
      checkInTime: now, checkOutTime: null, browser, device, updatedAt: now,
      workSummary: null, challenges: null, pendingTasks: null, tomorrowPriorities: null,
    }).where(eq(employeeCheckinsTable.id, existing.id)).returning();
    res.status(201).json(row);
  } else {
    const [row] = await db.insert(employeeCheckinsTable).values({ userId, checkDate: today, checkInTime: now, browser, device }).returning();
    res.status(201).json(row);
  }
});

// ── Check Out ─────────────────────────────────────────────────────────────
router.patch("/staff/checkin/checkout", staffAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const today = new Date().toISOString().slice(0, 10);
  const [existing] = await db.select().from(employeeCheckinsTable)
    .where(and(eq(employeeCheckinsTable.userId, userId), eq(employeeCheckinsTable.checkDate, today))).limit(1);
  if (!existing) { res.status(404).json({ error: "No check-in found for today" }); return; }

  const { workSummary, challenges, pendingTasks, tomorrowPriorities } = req.body;
  const now = new Date();
  const [row] = await db.update(employeeCheckinsTable).set({
    checkOutTime: now, updatedAt: now,
    workSummary: workSummary ?? null, challenges: challenges ?? null,
    pendingTasks: pendingTasks ?? null, tomorrowPriorities: tomorrowPriorities ?? null,
  }).where(eq(employeeCheckinsTable.id, existing.id)).returning();
  res.json(row);
});

// ── Admin: All Employee Attendance ────────────────────────────────────────
router.get("/admin/employee-attendance", requireRole("admin"), async (req, res) => {
  const date = String(req.query.date ?? new Date().toISOString().slice(0, 10));
  const checkins = await db.select({
    id: employeeCheckinsTable.id, userId: employeeCheckinsTable.userId,
    userName: usersTable.name, userRole: usersTable.role,
    checkDate: employeeCheckinsTable.checkDate,
    checkInTime: employeeCheckinsTable.checkInTime, checkOutTime: employeeCheckinsTable.checkOutTime,
    device: employeeCheckinsTable.device, browser: employeeCheckinsTable.browser,
    workSummary: employeeCheckinsTable.workSummary, challenges: employeeCheckinsTable.challenges,
    pendingTasks: employeeCheckinsTable.pendingTasks, tomorrowPriorities: employeeCheckinsTable.tomorrowPriorities,
  })
    .from(employeeCheckinsTable)
    .leftJoin(usersTable, eq(usersTable.id, employeeCheckinsTable.userId))
    .where(eq(employeeCheckinsTable.checkDate, date))
    .orderBy(employeeCheckinsTable.checkInTime);

  const allStaff = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role, isActive: usersTable.isActive })
    .from(usersTable).where(inArray(usersTable.role, ["admin", "teacher", "mentor"]));
  const checkedIn = new Set(checkins.map(c => c.userId));
  const notCheckedIn = allStaff.filter(s => s.isActive && !checkedIn.has(s.id));

  res.json({ checkins, notCheckedIn, date });
});

// ── Admin: Attendance history for a user ─────────────────────────────────
router.get("/admin/employee-attendance/:userId/history", requireRole("admin"), async (req, res) => {
  const userId = parseInt(String(req.params.userId), 10);
  const rows = await db.select().from(employeeCheckinsTable)
    .where(eq(employeeCheckinsTable.userId, userId))
    .orderBy(desc(employeeCheckinsTable.checkDate)).limit(30);
  res.json(rows);
});

export default router;
