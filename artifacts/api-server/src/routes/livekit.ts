import { Router } from "express";
import { db } from "@workspace/db";
import {
  liveClassesTable, mentorGroupsTable, groupStudentsTable,
  mentorStudentAssignmentsTable, gradeMentorAssignmentsTable, enrollmentsTable,
  demoBatchesTable, demoBatchEnrollmentsTable,
} from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { mintLiveKitToken, isLiveKitConfigured } from "../lib/livekit.js";

const router = Router();

// Every live-class DB record gets its own isolated, deterministic LiveKit room —
// stable across reconnects/retries and never shared across different live-class records.
function roomNameFor(liveClassId: number): string {
  return `braintam-live-${liveClassId}`;
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

    // course-based ("mastery") live classes don't use mentor_groups at all — a mentor is
    // authorized instead if one of their assigned students is enrolled in liveClass.courseId,
    // or the class's grade matches one of their active grade-team assignments.
    let hasCourseAccess = false;
    if (!group && liveClass.courseId) {
      const [assignedStudent] = await db
        .select({ studentId: mentorStudentAssignmentsTable.studentId })
        .from(mentorStudentAssignmentsTable)
        .innerJoin(enrollmentsTable, and(
          eq(enrollmentsTable.studentId, mentorStudentAssignmentsTable.studentId),
          eq(enrollmentsTable.courseId, liveClass.courseId),
        ))
        .where(and(eq(mentorStudentAssignmentsTable.mentorId, user.id), eq(mentorStudentAssignmentsTable.isActive, true)))
        .limit(1);
      const [gradeAssignment] = await db
        .select({ id: gradeMentorAssignmentsTable.id })
        .from(gradeMentorAssignmentsTable)
        .where(and(
          eq(gradeMentorAssignmentsTable.mentorId, user.id),
          eq(gradeMentorAssignmentsTable.isActive, true),
          eq(gradeMentorAssignmentsTable.grade, liveClass.grade),
        ))
        .limit(1);
      hasCourseAccess = Boolean(assignedStudent || gradeAssignment);
    }

    // New Ignite sessions (class_type='ignite') use demo_batch_enrollments, not mentor_groups.
    // A mentor is authorized if the batch is directly assigned to them, or via grade-team.
    let hasIgniteAccess = false;
    if (!group && !hasCourseAccess && liveClass.classType === "ignite" && liveClass.igniteBatchId) {
      const [batchRow] = await db
        .select({ mentorId: demoBatchesTable.mentorId })
        .from(demoBatchesTable)
        .where(eq(demoBatchesTable.id, liveClass.igniteBatchId))
        .limit(1);
      if (batchRow?.mentorId === user.id) {
        hasIgniteAccess = true;
      } else {
        // Fall back to grade-team assignment (grade is stored on live_classes)
        const [gradeAssign] = await db
          .select({ id: gradeMentorAssignmentsTable.id })
          .from(gradeMentorAssignmentsTable)
          .where(and(
            eq(gradeMentorAssignmentsTable.mentorId, user.id),
            eq(gradeMentorAssignmentsTable.isActive, true),
            eq(gradeMentorAssignmentsTable.grade, liveClass.grade),
          ))
          .limit(1);
        hasIgniteAccess = Boolean(gradeAssign);
      }
    }

    if (!group && !hasCourseAccess && !hasIgniteAccess) {
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

    let isGroupMember = false;
    if (groupIds.length > 0) {
      const membership = await db
        .select()
        .from(groupStudentsTable)
        .where(eq(groupStudentsTable.studentId, String(user.id)))
        .limit(1000)
        .then(rows => rows.some(r => groupIds.includes(r.mentorGroupId)));
      isGroupMember = membership;
    }

    // course-based live classes have no mentor_groups — authorize instead via direct
    // course enrollment (student's own enrollments row for liveClass.courseId).
    let isCourseEnrolled = false;
    if (!isGroupMember && liveClass.courseId) {
      const [enrollment] = await db
        .select({ id: enrollmentsTable.id })
        .from(enrollmentsTable)
        .where(and(eq(enrollmentsTable.studentId, user.id), eq(enrollmentsTable.courseId, liveClass.courseId)))
        .limit(1);
      isCourseEnrolled = Boolean(enrollment);
    }

    // New Ignite sessions (class_type='ignite') use demo_batch_enrollments — authorize
    // students who are enrolled in the batch that owns this live class.
    let isIgniteEnrolled = false;
    if (!isGroupMember && !isCourseEnrolled && liveClass.classType === "ignite" && liveClass.igniteBatchId) {
      const [batchEnrollment] = await db
        .select({ studentId: demoBatchEnrollmentsTable.studentId })
        .from(demoBatchEnrollmentsTable)
        .where(and(
          eq(demoBatchEnrollmentsTable.batchId, liveClass.igniteBatchId),
          eq(demoBatchEnrollmentsTable.studentId, user.id),
        ))
        .limit(1);
      isIgniteEnrolled = Boolean(batchEnrollment);
    }

    if (!isGroupMember && !isCourseEnrolled && !isIgniteEnrolled) {
      res.status(403).json({ error: "You are not enrolled in this session's group or course" });
      return;
    }
    canPublish = false; // students only get camera/mic publish rights while actively staged
  }

  let roomName = liveClass.liveKitRoomName;
  if (!roomName) {
    const generatedRoomName = roomNameFor(sessionId);
    // Idempotent: only writes if no room name exists yet (isNull guard), so concurrent
    // joins never race-overwrite an already-assigned room name for this live class.
    const [updated] = await db
      .update(liveClassesTable)
      .set({ liveKitRoomName: generatedRoomName })
      .where(and(eq(liveClassesTable.id, sessionId), isNull(liveClassesTable.liveKitRoomName)))
      .returning({ liveKitRoomName: liveClassesTable.liveKitRoomName });

    if (updated?.liveKitRoomName) {
      roomName = updated.liveKitRoomName;
    } else {
      const [freshClass] = await db
        .select({ liveKitRoomName: liveClassesTable.liveKitRoomName })
        .from(liveClassesTable)
        .where(eq(liveClassesTable.id, sessionId))
        .limit(1);
      roomName = freshClass?.liveKitRoomName ?? generatedRoomName;
    }
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
