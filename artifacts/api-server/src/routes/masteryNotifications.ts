import { Router } from "express";
import { db } from "@workspace/db";
import { masteryNotificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const allStaff = requireRole("mentor", "admin", "super_admin", "teacher");
const adminOnly = requireRole("admin", "super_admin");

// ── GET /api/mentor/mastery/notifications ─────────────────────────────────────
router.get("/mentor/mastery/notifications", allStaff, async (req, res) => {
  const user = req.authUser!;
  const isAdmin = ["admin", "super_admin"].includes(user.role ?? "");

  const rows = isAdmin
    ? await db
        .select()
        .from(masteryNotificationsTable)
        .orderBy(desc(masteryNotificationsTable.createdAt))
        .limit(100)
    : await db
        .select()
        .from(masteryNotificationsTable)
        .where(eq(masteryNotificationsTable.mentorId, user.id))
        .orderBy(desc(masteryNotificationsTable.createdAt))
        .limit(50);

  res.json(rows);
});

// ── POST /api/mentor/mastery/notifications/:id/read ──────────────────────────
router.post("/mentor/mastery/notifications/:id/read", allStaff, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .update(masteryNotificationsTable)
    .set({ isRead: true })
    .where(eq(masteryNotificationsTable.id, id))
    .returning();

  res.json(row);
});

// ── POST /api/mentor/mastery/notifications/read-all ──────────────────────────
router.post("/mentor/mastery/notifications/read-all", allStaff, async (req, res) => {
  const user = req.authUser!;
  await db
    .update(masteryNotificationsTable)
    .set({ isRead: true })
    .where(eq(masteryNotificationsTable.mentorId, user.id));
  res.json({ ok: true });
});

// ── GET /api/admin/mastery/notifications ─────────────────────────────────────
router.get("/admin/mastery/notifications", adminOnly, async (_req, res) => {
  const rows = await db
    .select()
    .from(masteryNotificationsTable)
    .orderBy(desc(masteryNotificationsTable.createdAt))
    .limit(200);
  res.json(rows);
});

// ── POST /api/admin/mastery/notifications ────────────────────────────────────
// Manually fire a notification to a mentor
router.post("/admin/mastery/notifications", adminOnly, async (req, res) => {
  const { mentorId, type, title, body, masteryStudentId, studentName, amount } = req.body as {
    mentorId: number; type: string; title: string; body: string;
    masteryStudentId?: number; studentName?: string; amount?: number;
  };
  if (!mentorId || !title || !body) {
    res.status(400).json({ error: "mentorId, title, body required" });
    return;
  }
  const [row] = await db
    .insert(masteryNotificationsTable)
    .values({ mentorId, type: type ?? "info", title, body, masteryStudentId, studentName, amount })
    .returning();
  res.json(row);
});

export default router;
