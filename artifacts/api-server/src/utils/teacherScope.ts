import { eq } from "drizzle-orm";
import {
  liveClassesTable,
  homeworkTable,
  testsTable,
  assignmentsTable,
} from "@workspace/db";

/**
 * Teacher Data Scoping — Security helpers
 *
 * Every query against Classes, Homework, Assignments, and Tests that runs in a
 * teacher context MUST be wrapped with one of these filters. This ensures a
 * teacher can never read or mutate another teacher's data.
 *
 * Usage in a route:
 *
 *   const rows = await db
 *     .select()
 *     .from(liveClassesTable)
 *     .where(teacherClassFilter(req.authUser!.id));
 */

/** WHERE clause: live_classes owned by this teacher */
export function teacherClassFilter(teacherId: number) {
  return eq(liveClassesTable.teacherId, teacherId);
}

/** WHERE clause: homework owned by this teacher */
export function teacherHomeworkFilter(teacherId: number) {
  return eq(homeworkTable.teacherId, teacherId);
}

/** WHERE clause: assignments owned by this teacher */
export function teacherAssignmentFilter(teacherId: number) {
  return eq(assignmentsTable.teacherId, teacherId);
}

/** WHERE clause: tests owned by this teacher */
export function teacherTestFilter(teacherId: number) {
  return eq(testsTable.teacherId, teacherId);
}

/**
 * Returns all four filters in one object — useful when you want to assert
 * ownership across all resource types in one place.
 */
export function allTeacherFilters(teacherId: number) {
  return {
    classFilter:      teacherClassFilter(teacherId),
    homeworkFilter:   teacherHomeworkFilter(teacherId),
    assignmentFilter: teacherAssignmentFilter(teacherId),
    testFilter:       teacherTestFilter(teacherId),
  };
}
