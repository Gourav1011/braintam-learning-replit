import { db } from "@workspace/db";
import {
  liveClassesTable,
  mentorGroupsTable,
  groupStudentsTable,
  enrollmentsTable,
  demoBatchEnrollmentsTable,
  mentorStudentAssignmentsTable,
  gradeMentorAssignmentsTable,
  demoBatchesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { AuthUser } from "../middlewares/auth.js";

export async function canAccessLiveClass(
  sessionId: number,
  user: AuthUser
): Promise<boolean> {
  const [liveClass] = await db
    .select()
    .from(liveClassesTable)
    .where(eq(liveClassesTable.id, sessionId))
    .limit(1);

  if (!liveClass) return false;

  if (user.role === "admin" || user.role === "super_admin") return true;

  if (user.role === "teacher") {
    return liveClass.teacherId === user.id;
  }

  if (
    user.role === "mentor" ||
    user.role === "sales_mentor" ||
    user.role === "academic_mentor"
  ) {
    // Legacy/session-based mentor group access
    const [group] = await db
      .select({ id: mentorGroupsTable.id })
      .from(mentorGroupsTable)
      .where(and(
        eq(mentorGroupsTable.mentorId, user.id),
        eq(mentorGroupsTable.sessionId, sessionId)
      ))
      .limit(1);

    if (group) return true;

    // Mastery/course access through assigned enrolled student
    if (liveClass.courseId) {
      const [assignedStudent] = await db
        .select({ studentId: mentorStudentAssignmentsTable.studentId })
        .from(mentorStudentAssignmentsTable)
        .innerJoin(enrollmentsTable, and(
          eq(enrollmentsTable.studentId, mentorStudentAssignmentsTable.studentId),
          eq(enrollmentsTable.courseId, liveClass.courseId)
        ))
        .where(and(
          eq(mentorStudentAssignmentsTable.mentorId, user.id),
          eq(mentorStudentAssignmentsTable.isActive, true)
        ))
        .limit(1);

      if (assignedStudent) return true;

      const [gradeAssignment] = await db
        .select({ id: gradeMentorAssignmentsTable.id })
        .from(gradeMentorAssignmentsTable)
        .where(and(
          eq(gradeMentorAssignmentsTable.mentorId, user.id),
          eq(gradeMentorAssignmentsTable.isActive, true),
          eq(gradeMentorAssignmentsTable.grade, liveClass.grade)
        ))
        .limit(1);

      if (gradeAssignment) return true;
    }

    // Ignite batch access
    if (liveClass.classType === "ignite" && liveClass.igniteBatchId) {
      const [batch] = await db
        .select({ mentorId: demoBatchesTable.mentorId })
        .from(demoBatchesTable)
        .where(eq(demoBatchesTable.id, liveClass.igniteBatchId))
        .limit(1);

      if (batch?.mentorId === user.id) return true;

      const [gradeAssignment] = await db
        .select({ id: gradeMentorAssignmentsTable.id })
        .from(gradeMentorAssignmentsTable)
        .where(and(
          eq(gradeMentorAssignmentsTable.mentorId, user.id),
          eq(gradeMentorAssignmentsTable.isActive, true),
          eq(gradeMentorAssignmentsTable.grade, liveClass.grade)
        ))
        .limit(1);

      if (gradeAssignment) return true;
    }

    return false;
  }

  if (user.role === "student") {
    if (liveClass.courseId) {
      const [enrollment] = await db
        .select({ id: enrollmentsTable.id })
        .from(enrollmentsTable)
        .where(and(
          eq(enrollmentsTable.studentId, user.id),
          eq(enrollmentsTable.courseId, liveClass.courseId)
        ))
        .limit(1);

      if (enrollment) return true;
    }

    if (liveClass.classType === "ignite" && liveClass.igniteBatchId) {
      const [enrollment] = await db
        .select({ studentId: demoBatchEnrollmentsTable.studentId })
        .from(demoBatchEnrollmentsTable)
        .where(and(
          eq(demoBatchEnrollmentsTable.batchId, liveClass.igniteBatchId),
          eq(demoBatchEnrollmentsTable.studentId, user.id)
        ))
        .limit(1);

      if (enrollment) return true;
    }

    const groups = await db
      .select({ id: mentorGroupsTable.id })
      .from(mentorGroupsTable)
      .where(eq(mentorGroupsTable.sessionId, sessionId));

    if (!groups.length) return false;

    const memberships = await db
      .select()
      .from(groupStudentsTable)
      .where(eq(groupStudentsTable.studentId, String(user.id)));

    return memberships.some(m => groups.some(g => g.id === m.mentorGroupId));
  }

  return false;
}

export async function getAuthorizedGroupId(
  sessionId: number,
  user: AuthUser
): Promise<string | null> {
  if (user.role === "student") {
    const groups = await db
      .select({ id: mentorGroupsTable.id })
      .from(mentorGroupsTable)
      .where(eq(mentorGroupsTable.sessionId, sessionId));

    for (const group of groups) {
      const [membership] = await db
        .select({ id: groupStudentsTable.id })
        .from(groupStudentsTable)
        .where(and(
          eq(groupStudentsTable.mentorGroupId, group.id),
          eq(groupStudentsTable.studentId, String(user.id))
        ))
        .limit(1);

      if (membership) return String(group.id);
    }

    return null;
  }

  if (
    user.role === "mentor" ||
    user.role === "sales_mentor" ||
    user.role === "academic_mentor"
  ) {
    const [group] = await db
      .select({ id: mentorGroupsTable.id })
      .from(mentorGroupsTable)
      .where(and(
        eq(mentorGroupsTable.sessionId, sessionId),
        eq(mentorGroupsTable.mentorId, user.id)
      ))
      .limit(1);

    return group ? String(group.id) : null;
  }

  return null;
}
