import { Router } from "express";
import { db } from "@workspace/db";
import {
  blockedWordsTable,
  chatModerationTable,
  chatViolationsTable,
} from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// ── Blocked Words ──────────────────────────────────────────────

// GET /api/chat-moderation/blocked-words
router.get("/chat-moderation/blocked-words", async (_req, res) => {
  try {
    const words = await db
      .select()
      .from(blockedWordsTable)
      .orderBy(desc(blockedWordsTable.createdAt));
    return res.json({ words });
  } catch (err) {
    logger.error({ err }, "fetch blocked-words failed");
    return res.status(500).json({ error: "Query failed" });
  }
});

// POST /api/chat-moderation/blocked-words
router.post("/chat-moderation/blocked-words", async (req, res) => {
  const { word, isActive = true } = req.body as { word?: string; isActive?: boolean };
  if (!word?.trim()) return res.status(400).json({ error: "word is required" });

  try {
    const [row] = await db
      .insert(blockedWordsTable)
      .values({ word: word.trim().toLowerCase(), isActive })
      .onConflictDoUpdate({
        target: blockedWordsTable.word,
        set: { isActive },
      })
      .returning();
    return res.json({ ok: true, word: row });
  } catch (err) {
    logger.error({ err }, "add blocked-word failed");
    return res.status(500).json({ error: "Insert failed" });
  }
});

// PATCH /api/chat-moderation/blocked-words/:id
router.patch("/chat-moderation/blocked-words/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  if (Number.isNaN(id)) return res.status(400).json({ error: "invalid id" });
  const { isActive } = req.body as { isActive: boolean };
  try {
    await db
      .update(blockedWordsTable)
      .set({ isActive })
      .where(eq(blockedWordsTable.id, id));
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "update blocked-word failed");
    return res.status(500).json({ error: "Update failed" });
  }
});

// DELETE /api/chat-moderation/blocked-words/:id
router.delete("/chat-moderation/blocked-words/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  if (Number.isNaN(id)) return res.status(400).json({ error: "invalid id" });
  try {
    await db.delete(blockedWordsTable).where(eq(blockedWordsTable.id, id));
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "delete blocked-word failed");
    return res.status(500).json({ error: "Delete failed" });
  }
});

// ── Student Chat Status ────────────────────────────────────────

// GET /api/chat-moderation/student/:studentId/status
router.get("/chat-moderation/student/:studentId/status", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(chatModerationTable)
      .where(eq(chatModerationTable.studentId, req.params["studentId"]!));
    return res.json({ status: row ?? null });
  } catch (err) {
    logger.error({ err }, "fetch chat-moderation status failed");
    return res.status(500).json({ error: "Query failed" });
  }
});

// PATCH /api/chat-moderation/student/:studentId/unblock
router.patch("/chat-moderation/student/:studentId/unblock", async (req, res) => {
  const { unlockedBy } = req.body as { unlockedBy?: string };
  try {
    await db
      .insert(chatModerationTable)
      .values({
        studentId: req.params["studentId"]!,
        studentName: "",
        chatStatus: "active",
        chatViolationCount: 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: chatModerationTable.studentId,
        set: {
          chatStatus: "active",
          chatBlockedAt: null,
          chatBlockReason: sql`${chatModerationTable.chatBlockReason} || ' [unblocked by ' || ${unlockedBy ?? "mentor"} || ']'`,
          updatedAt: new Date(),
        },
      });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "unblock chat failed");
    return res.status(500).json({ error: "Update failed" });
  }
});

// PATCH /api/chat-moderation/student/:studentId/reset-violations
router.patch("/chat-moderation/student/:studentId/reset-violations", async (req, res) => {
  try {
    await db
      .insert(chatModerationTable)
      .values({
        studentId: req.params["studentId"]!,
        studentName: "",
        chatStatus: "active",
        chatViolationCount: 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: chatModerationTable.studentId,
        set: {
          chatViolationCount: 0,
          chatStatus: "active",
          chatBlockedAt: null,
          chatBlockReason: null,
          updatedAt: new Date(),
        },
      });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "reset violations failed");
    return res.status(500).json({ error: "Update failed" });
  }
});

// ── Violations Log ─────────────────────────────────────────────

// GET /api/chat-moderation/violations?studentId=&sessionId=&limit=100
router.get("/chat-moderation/violations", async (req, res) => {
  const { studentId, sessionId, limit: rawLimit } = req.query as Record<string, string | undefined>;
  const limit = Math.min(Number(rawLimit ?? 100), 500);

  try {
    let q = db
      .select()
      .from(chatViolationsTable)
      .orderBy(desc(chatViolationsTable.createdAt))
      .limit(limit)
      .$dynamic();

    if (studentId) q = q.where(eq(chatViolationsTable.studentId, studentId));
    if (sessionId)  q = q.where(eq(chatViolationsTable.sessionId, Number(sessionId)));

    const rows = await q;
    return res.json({ violations: rows, total: rows.length });
  } catch (err) {
    logger.error({ err }, "fetch violations failed");
    return res.status(500).json({ error: "Query failed" });
  }
});

export default router;
