import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, otpTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { RegisterBody, LoginBody, SendOtpBody, VerifyOtpBody } from "@workspace/api-zod";
import crypto from "crypto";
import { sendOtp } from "../sms.js";

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
  const { name, email, phone, grade, password } = parsed.data;
  if (!email && !phone) {
    res.status(400).json({ error: "Email or phone required" });
    return;
  }
  const existing = await db.select().from(usersTable).where(
    email ? eq(usersTable.email, email) : eq(usersTable.phone, phone!)
  ).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "User already exists" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name,
    email: email ?? null,
    phone: phone ?? null,
    grade,
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
    res.status(400).json({ error: "Email or phone required" });
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
  res.json({ token: generateToken(user.id), student: userToProfile(user) });
});

router.post("/auth/send-otp", async (req, res) => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { phone } = parsed.data;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.insert(otpTable).values({ phone, code, expiresAt });

  let smsSent = false;
  try {
    smsSent = await sendOtp(phone, code);
  } catch (err) {
    req.log.error({ phone, err }, "SMS send threw an unexpected error");
  }

  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !smsSent) {
    res.status(503).json({ error: "SMS delivery failed. Please try again shortly." });
    return;
  }

  req.log.info({ phone, smsSent }, "OTP send-otp handled");
  res.json({ success: true, message: `OTP sent to ${phone}` });
});

router.post("/auth/verify-otp", async (req, res) => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { phone, otp, name, grade } = parsed.data;
  const otps = await db.select().from(otpTable).where(
    eq(otpTable.phone, phone)
  ).orderBy(otpTable.createdAt).limit(5);
  const valid = otps.find(o => !o.used && o.code === otp && o.expiresAt > new Date());
  if (!valid) {
    res.status(400).json({ error: "Invalid or expired OTP" });
    return;
  }
  await db.update(otpTable).set({ used: true }).where(eq(otpTable.id, valid.id));
  let users = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  let user = users[0];
  if (!user) {
    if (!name || !grade) {
      res.status(400).json({ error: "Name and grade required for new users" });
      return;
    }
    const inserted = await db.insert(usersTable).values({
      name,
      phone,
      grade,
      points: 0,
      streakDays: 1,
    }).returning();
    user = inserted[0];
  }
  res.json({ token: generateToken(user.id), student: userToProfile(user) });
});

export default router;
