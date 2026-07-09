import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import crypto from "crypto";
import { checkDailyLogin } from "../services/pointsService.js";
import { logAction } from "../utils/audit.js";

const router = Router();

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw + "braintam_salt").digest("hex");
}

function generateToken(userId: number): string {
  return Buffer.from(`${userId}:${Date.now()}:braintam`).toString("base64");
}

function userToProfile(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email ?? null,
    phone: u.phone ?? null,
    grade: u.grade,
    role: u.role ?? "student",
    avatarUrl: u.avatarUrl ?? null,
    points: u.points,
    rank: u.rank ?? null,
    school: u.school ?? null,
  };
}

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, email, grade, password } = parsed.data;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "An account with this email already exists" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    phone: null,
    grade: grade ?? 0,
    role: "student",
    passwordHash: password ? hashPassword(password) : null,
    points: 0,
    streakDays: 1,
  }).returning();
  res.status(201).json({ token: generateToken(user.id), student: userToProfile(user) });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, phone, password } = parsed.data;
  if (!email && !phone) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  const users = await db.select().from(usersTable).where(
    email ? eq(usersTable.email, email) : eq(usersTable.phone, phone!)
  ).limit(1);
  if (users.length === 0) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const user = users[0];
  if (user.passwordHash && user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (user.isActive === false) {
    res.status(403).json({ error: "This account has been disabled. Contact the administrator." });
    return;
  }
  const role = user.role ?? "student";
  if (role !== "student") {
    const xff = req.headers["x-forwarded-for"];
    const ip = xff ? (Array.isArray(xff) ? xff[0] : xff).split(",")[0].trim() : (req.socket?.remoteAddress ?? "unknown");
    const ua = String(req.headers["user-agent"] ?? "");
    logAction({ actorId: user.id, actorName: user.name, actorRole: role, actorEmail: user.email ?? undefined, action: "login", actionLabel: `${role} logged in`, category: "auth", module: "Users", targetType: "user", targetId: user.id, targetName: user.name, ipAddress: ip, userAgent: ua }).catch(() => {});
  }
  res.json({ token: generateToken(user.id), student: userToProfile(user) });
});

router.post("/auth/clerk-sync", async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    res.status(400).json({ error: "email and name required" });
    return;
  }
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    // Never overwrite a name the student has already set — only fill it in
    // if the DB name is empty (e.g. a very first sync with no name yet).
    let profile = existing;
    if (!existing.name) {
      const [updated] = await db.update(usersTable)
        .set({ name })
        .where(eq(usersTable.id, existing.id))
        .returning();
      profile = updated;
    }
    // Track this login — idempotent, no-op if already claimed today
    checkDailyLogin(profile.id).catch(() => {});
    res.json({ token: generateToken(profile.id), student: userToProfile(profile) });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    phone: null,
    grade: 0,
    role: "student",
    passwordHash: null,
    points: 0,
    streakDays: 1,
  }).returning();
  // Track first login
  checkDailyLogin(user.id).catch(() => {});
  res.status(201).json({ token: generateToken(user.id), student: userToProfile(user) });
});

router.post("/auth/reset-password-email", async (req, res) => {
  const { email, phone, newPassword } = req.body;
  if ((!email && !phone) || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Email or phone and new password (min 6 chars) required" });
    return;
  }
  const users = await db.select().from(usersTable).where(
    email ? eq(usersTable.email, email) : eq(usersTable.phone, phone)
  ).limit(1);
  if (users.length === 0) {
    res.status(404).json({ error: "No account found. Please check and try again." });
    return;
  }
  const user = users[0];
  await db.update(usersTable)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(usersTable.id, user.id));
  res.json({ token: generateToken(user.id), student: userToProfile(user) });
});

export default router;
