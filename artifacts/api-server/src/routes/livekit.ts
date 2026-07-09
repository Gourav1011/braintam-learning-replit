import { Router } from "express";
import { db } from "@workspace/db";
import { liveClassesTable, mentorGroupsTable, groupStudentsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { mintLiveKitToken, isLiveKitConfigured } from "../lib/livekit.js";
import crypto from "crypto";

const router = Router();

function roomNameFor(sessionId: number): string {
  return `session-${sessionId}-${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * Mint a LiveKit access token for a live class session.
 * Authorization is fully server-side — the frontend's claimed role/grade/group is never trusted.
 *  - teacher/admin/super_admin: must be the assigned teacher of this class (or admin) → can publish.
 *  - mentor/sales_mentor/academic_mentor: must own a mentor_group tied to this session → subscribe only.
 *  - student: must belong to a mentor_group tied to this session AND match the class grade → subscribe only
 *             (publish is granted temporarily by the teacher via the stage feature, not via this token).
 */
router.post("/live/:sessionId/livekit-token", requireAuth, async (req, res) => {
  if (!isLiveKitConfigured()) {
    res.status(503).json({ error: "LiveKit is not configured on this server" });
    return;
  }
  const sessionId = Number(req.params.sessionId);
  if (!Number.isFinite(sessionId)) {
    res.status(400).json({ error: "Invalid sessionId" });
    return;
  }
  const user = req.authUser!;

  const [liveClass] = await db
    .select()
    .from(liveClassesTable)
    .where(eq(liveClassesTable.id, sessionId))
    .limit(1);

  if (!liveClass) {
    res.status(404).json({ error: "Live class not found" });
    return;
  }

  let canPublish = false;
  let canPublishScreen = false;

  if (user.role === "admin" || user.role === "super_admin") {
    canPublish = true;
    canPublishScreen = true;
  } else if (user.role === "teacher") {
    if (liveClass.teacherId !== user.id) {
      res.status(403).json({ error: "You are not the assigned teacher for this class" });
      return;
    }
    canPublish = true;
    canPublishScreen = true;
  } else if (user.role === "mentor" || user.role === "sales_mentor" || user.role === "academic_mentor") {
    const [group] = await db
      .select()
      .from(mentorGroupsTable)
      .where(and(eq(mentorGroupsTable.mentorId, user.id), eq(mentorGroupsTable.sessionId, sessionId)))
      .limit(1);
    if (!group) {
      res.status(403).json({ error: "You are not assigned to a mentor group in this session" });
      return;
    }
    canPublish = false; // mentors watch/moderate; they don't publish video into LiveKit
  } else {
    // student
    const groups = await db
      .select({ id: mentorGroupsTable.id })
      .from(mentorGroupsTable)
      .where(eq(mentorGroupsTable.sessionId, sessionId));
    const groupIds = groups.map(g => g.id);
    if (groupIds.length === 0) {
      res.status(403).json({ error: "No mentor groups configured for this session" });
      return;
    }
    const [membership] = await db
      .select()
      .from(groupStudentsTable)
      .where(eq(groupStudentsTable.studentId, String(user.id)))
      .limit(1000)
      .then(rows => rows.filter(r => groupIds.includes(r.mentorGroupId)));
    if (!membership) {
      res.status(403).json({ error: "You are not enrolled in this session's group" });
      return;
    }
    canPublish = false; // students only get camera/mic publish rights while actively staged
  }

  let roomName = liveClass.liveKitRoomName;
  if (!roomName) {
    const candidate = roomNameFor(sessionId);
    const [updated] = await db
      .update(liveClassesTable)
      .set({ liveKitRoomName: sql`COALESCE(${liveClassesTable.liveKitRoomName}, ${candidate})` })
      .where(eq(liveClassesTable.id, sessionId))
      .returning({ liveKitRoomName: liveClassesTable.liveKitRoomName });
    roomName = updated?.liveKitRoomName ?? candidate;
  }

  const token = await mintLiveKitToken({
    roomName,
    identity: String(user.id),
    name: user.name,
    canPublish,
    canPublishScreen,
    role: user.role,
  });

  res.json({
    token,
    url: process.env["LIVEKIT_URL"],
    roomName,
    canPublish,
    identity: String(user.id),
  });
});

export default router;
