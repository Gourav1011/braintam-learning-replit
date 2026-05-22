import { Router } from "express";
import { db } from "@workspace/db";
import { announcementsTable, bannersTable, usersTable } from "@workspace/db";
import { eq, desc, and, or } from "drizzle-orm";
import { requireRole, attachUser } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin");

// ── Announcements (admin CRUD) ────────────────────────────────
router.get("/admin/announcements", adminOnly, async (req, res) => {
  const rows = await db
    .select({
      id: announcementsTable.id,
      title: announcementsTable.title,
      body: announcementsTable.body,
      grade: announcementsTable.grade,
      targetRole: announcementsTable.targetRole,
      isActive: announcementsTable.isActive,
      createdBy: announcementsTable.createdBy,
      createdAt: announcementsTable.createdAt,
    })
    .from(announcementsTable)
    .orderBy(desc(announcementsTable.createdAt));
  res.json(rows);
});

router.post("/admin/announcements", adminOnly, async (req, res) => {
  const { title, body, grade, targetRole } = req.body;
  if (!title || !body) {
    res.status(400).json({ error: "title and body are required" });
    return;
  }
  const [row] = await db.insert(announcementsTable).values({
    title,
    body,
    grade: grade ?? null,
    targetRole: targetRole ?? "all",
    isActive: true,
    createdBy: req.authUser!.id,
  }).returning();
  res.status(201).json(row);
});

router.patch("/admin/announcements/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { title, body, grade, targetRole, isActive } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (body !== undefined) updates.body = body;
  if (grade !== undefined) updates.grade = grade;
  if (targetRole !== undefined) updates.targetRole = targetRole;
  if (isActive !== undefined) updates.isActive = isActive;
  const [updated] = await db.update(announcementsTable).set(updates).where(eq(announcementsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/admin/announcements/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.json({ success: true });
});

// ── Banners (admin CRUD) ──────────────────────────────────────
router.get("/admin/banners", adminOnly, async (req, res) => {
  const rows = await db.select().from(bannersTable).orderBy(bannersTable.displayOrder);
  res.json(rows);
});

router.post("/admin/banners", adminOnly, async (req, res) => {
  const { title, imageUrl, link, displayOrder } = req.body;
  if (!title || !imageUrl) {
    res.status(400).json({ error: "title and imageUrl are required" });
    return;
  }
  const [row] = await db.insert(bannersTable).values({
    title,
    imageUrl,
    link: link ?? null,
    isActive: true,
    displayOrder: displayOrder ?? 0,
  }).returning();
  res.status(201).json(row);
});

router.patch("/admin/banners/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { title, imageUrl, link, isActive, displayOrder } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (link !== undefined) updates.link = link;
  if (isActive !== undefined) updates.isActive = isActive;
  if (displayOrder !== undefined) updates.displayOrder = displayOrder;
  const [updated] = await db.update(bannersTable).set(updates).where(eq(bannersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/admin/banners/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(bannersTable).where(eq(bannersTable.id, id));
  res.json({ success: true });
});

// ── Public: announcements for logged-in users ─────────────────
router.get("/announcements", attachUser, async (req, res) => {
  const user = req.authUser;
  const rows = await db.select().from(announcementsTable)
    .where(eq(announcementsTable.isActive, true))
    .orderBy(desc(announcementsTable.createdAt))
    .limit(20);
  res.json(rows);
});

// ── Public: active banners ────────────────────────────────────
router.get("/banners", async (_req, res) => {
  const rows = await db.select().from(bannersTable)
    .where(eq(bannersTable.isActive, true))
    .orderBy(bannersTable.displayOrder)
    .limit(10);
  res.json(rows);
});

export default router;
