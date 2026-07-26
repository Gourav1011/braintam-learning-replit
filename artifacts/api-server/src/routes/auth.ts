import { Router } from "express";
import {
  generateAuthToken,
  verifyPasswordSetupToken,
} from "../lib/auth-token.js";
import { db } from "@workspace/db";
import { usersTable, paymentsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { checkDailyLogin } from "../services/pointsService.js";
import { logAction } from "../utils/audit.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

const router = Router();

function generateToken(userId: number): string {
  return generateAuthToken(userId);
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
    res.status(400).json({
      error: "Enter your name, 10-digit phone number, grade, and password."
    });
    return;
  }

  const { name, grade, password } = parsed.data;
  const phone = parsed.data.phone;

  // RegisterBody validates this as a 10-digit Indian mobile number.
  // Keep the runtime guard because the workspace package's generated
  // declaration may still expose phone as nullable until regenerated.
  if (!phone) {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({
      error: "An account with this phone number already exists. Please sign in."
    });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      name: name.trim(),
      email: null,
      phone,
      grade,
      role: "student",
      accountType: "lead",
      leadStage: "new",
      leadSource: "Website",
      isWebsiteLead: true,
      assignmentStatus: "unassigned",
      isCurrentWeek: false,

      // We have the phone number, but ownership has not yet been
      // verified by OTP.
      phoneVerified: false,

      passwordHash: hashPassword(password),
      points: 0,
      streakDays: 1,
    })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Unable to create account" });
    return;
  }

  res.status(201).json({
    token: generateToken(user.id),
    student: userToProfile(user),
  });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, phone, password } = parsed.data;
  if (!email && !phone) {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }

  const users = await db.select().from(usersTable).where(
    phone ? eq(usersTable.phone, phone) : eq(usersTable.email, email!)
  ).limit(1);

  if (users.length === 0) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const user = users[0];

  // Accounts without a password must never authenticate by supplying
  // an arbitrary password. An admin must set/reset the password first.
  if (!verifyPassword(password, user.passwordHash)) {
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
    // New Clerk sign-ups are website leads — visible in the CRM from day one.
    // Admins/mentors can later convert them to demo_student or paid_student.
    accountType: "lead",
    leadStage: "new",
    leadSource: "Website",
    isWebsiteLead: true,
    assignmentStatus: "unassigned",
    isCurrentWeek: false,
    passwordHash: null,
    points: 0,
    streakDays: 1,
  }).returning();
  // Track first login
  checkDailyLogin(user.id).catch(() => {});
  res.status(201).json({ token: generateToken(user.id), student: userToProfile(user) });
});

router.post("/auth/setup-password", async (req, res) => {
  const setupToken =
    typeof req.body?.setupToken === "string" ? req.body.setupToken : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!setupToken) {
    res.status(400).json({ error: "Password setup token is required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const setup = verifyPasswordSetupToken(setupToken);
  if (!setup) {
    res.status(401).json({
      error: "This password setup link is invalid or has expired."
    });
    return;
  }

  // The setup token is only valid when its captured payment belongs
  // to the same student encoded in the token.
  const [payment] = await db
    .select({
      id: paymentsTable.id,
      studentId: paymentsTable.studentId,
      status: paymentsTable.status,
    })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.id, setup.paymentId),
        eq(paymentsTable.studentId, setup.userId),
        eq(paymentsTable.status, "captured"),
      ),
    )
    .limit(1);

  if (!payment) {
    res.status(403).json({ error: "Payment verification failed" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, setup.userId))
    .limit(1);

  if (!user || user.role !== "student") {
    res.status(404).json({ error: "Student account not found" });
    return;
  }

  if (user.isActive === false) {
    res.status(403).json({ error: "This account has been disabled" });
    return;
  }

  // Initial setup only. Never use this endpoint to replace a password.
  if (user.passwordHash) {
    res.status(409).json({
      error: "Password has already been created. Please sign in."
    });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({
      passwordHash: hashPassword(password),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(usersTable.id, user.id),
        isNull(usersTable.passwordHash),
      ),
    )
    .returning();

  if (!updated) {
    res.status(409).json({
      error: "Password has already been created. Please sign in."
    });
    return;
  }

  checkDailyLogin(updated.id).catch(() => {});

  res.json({
    success: true,
    token: generateToken(updated.id),
    student: userToProfile(updated),
  });
});

router.post("/auth/reset-password-email", (_req, res) => {
  // Public password reset is disabled until an ownership-verification
  // mechanism (OTP/recovery flow) is implemented.
  res.status(410).json({
    error: "Self-service password reset is temporarily unavailable. Please contact support."
  });
});

export default router;
