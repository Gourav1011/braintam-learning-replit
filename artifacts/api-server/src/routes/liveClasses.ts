import { Router } from "express";
import { db } from "@workspace/db";
import {
  liveClassesTable,
  subjectsTable,
  enrollmentsTable,
  masteryStudentsTable,
  demoBatchEnrollmentsTable,
} from "@workspace/db";
import { ListLiveClassesQueryParams, GetLiveClassParams, JoinLiveClassParams } from "@workspace/api-zod";
import { eq, and, or, inArray } from "drizzle-orm";
import { attachUser } from "../middlewares/auth.js";

const router = Router();

async function getStudentAssignedCourseIds(studentId: number): Promise<number[]> {
  const [enrolled, mastery] = await Promise.all([
    db
      .select({ courseId: enrollmentsTable.courseId })
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.studentId, studentId)),

    db
      .select({ assignedCourseId: masteryStudentsTable.assignedCourseId })
      .from(masteryStudentsTable)
      .where(eq(masteryStudentsTable.studentId, studentId)),
  ]);

  const ids = new Set<number>();

  for (const row of enrolled) {
    if (row.courseId != null) ids.add(row.courseId);
  }

  for (const row of mastery) {
    if (row.assignedCourseId != null) ids.add(row.assignedCourseId);
  }

  return [...ids];
}

async function getStudentIgniteBatchIds(studentId: number): Promise<number[]> {
  const rows = await db
    .select({ batchId: demoBatchEnrollmentsTable.batchId })
    .from(demoBatchEnrollmentsTable)
    .where(eq(demoBatchEnrollmentsTable.studentId, studentId));

  return [...new Set(rows.map(row => row.batchId))];
}

router.get("/live-classes", attachUser, async (req, res) => {
  const parsed = ListLiveClassesQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const user = req.authUser;

  // Non-authenticated users see nothing
  if (!user) {
    res.json([]);
    return;
  }

  // Students only see live classes belonging to courses in which
  // they are explicitly enrolled. Grade alone grants no access.
  // Teachers/Admins/Mentors continue to see all classes.
  let studentFilter;
  if (user.role === "student") {
    const [assignedCourseIds, igniteBatchIds] = await Promise.all([
      getStudentAssignedCourseIds(user.id),
      getStudentIgniteBatchIds(user.id),
    ]);

    const accessFilters = [];

    if (assignedCourseIds.length > 0) {
      accessFilters.push(
        inArray(liveClassesTable.courseId, assignedCourseIds)
      );
    }

    if (igniteBatchIds.length > 0) {
      accessFilters.push(
        and(
          eq(liveClassesTable.classType, "ignite"),
          inArray(liveClassesTable.igniteBatchId, igniteBatchIds)
        )
      );
    }

    if (accessFilters.length === 0) {
      res.json([]);
      return;
    }

    studentFilter =
      accessFilters.length === 1
        ? accessFilters[0]
        : or(...accessFilters);
  }

  const classes = await db.select({
    id: liveClassesTable.id,
    title: liveClassesTable.title,
    subjectId: liveClassesTable.subjectId,
    subjectName: subjectsTable.name,
    grade: liveClassesTable.grade,
    courseId: liveClassesTable.courseId,
    scheduledAt: liveClassesTable.scheduledAt,
    duration: liveClassesTable.duration,
    teacher: liveClassesTable.teacher,
    teacherAvatar: liveClassesTable.teacherAvatar,
    status: liveClassesTable.status,
    thumbnailUrl: liveClassesTable.thumbnailUrl,
    studentsJoined: liveClassesTable.studentsJoined,
  })
    .from(liveClassesTable)
    .leftJoin(subjectsTable, eq(liveClassesTable.subjectId, subjectsTable.id))
    .where(
      and(
        studentFilter,
        params.grade ? eq(liveClassesTable.grade, params.grade) : undefined,
        params.subjectId ? eq(liveClassesTable.subjectId, params.subjectId) : undefined,
      )
    );

  res.json(classes.map(c => ({
    ...c,
    scheduledAt: c.scheduledAt.toISOString(),
    teacherAvatar: c.teacherAvatar ?? null,
    thumbnailUrl: c.thumbnailUrl ?? null,
    studentsJoined: c.studentsJoined ?? 0,
  })));
});

router.get("/live-classes/:id", attachUser, async (req, res) => {
  const parsed = GetLiveClassParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [cls] = await db.select({
    id: liveClassesTable.id,
    title: liveClassesTable.title,
    subjectId: liveClassesTable.subjectId,
    subjectName: subjectsTable.name,
    grade: liveClassesTable.grade,
    courseId: liveClassesTable.courseId,
    scheduledAt: liveClassesTable.scheduledAt,
    duration: liveClassesTable.duration,
    teacher: liveClassesTable.teacher,
    teacherAvatar: liveClassesTable.teacherAvatar,
    status: liveClassesTable.status,
    thumbnailUrl: liveClassesTable.thumbnailUrl,
    studentsJoined: liveClassesTable.studentsJoined,
  })
    .from(liveClassesTable)
    .innerJoin(subjectsTable, eq(liveClassesTable.subjectId, subjectsTable.id))
    .where(eq(liveClassesTable.id, parsed.data.id));

  if (!cls) { res.status(404).json({ error: "Not found" }); return; }

  const user = req.authUser;
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (user.role === "student") {
    const courseId = cls.courseId;

    if (!courseId) {
      res.status(403).json({ error: "You do not have access to this live class" });
      return;
    }

    const assignedCourseIds = await getStudentAssignedCourseIds(user.id);

    if (!assignedCourseIds.includes(courseId)) {
      res.status(403).json({ error: "You do not have access to this live class" });
      return;
    }
  }

  res.json({ ...cls, scheduledAt: cls.scheduledAt.toISOString(), teacherAvatar: cls.teacherAvatar ?? null, thumbnailUrl: cls.thumbnailUrl ?? null, studentsJoined: cls.studentsJoined ?? 0 });
});

router.post("/live-classes/:id/join", attachUser, async (req, res) => {
  const parsed = JoinLiveClassParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [cls] = await db.select().from(liveClassesTable).where(eq(liveClassesTable.id, parsed.data.id));
  if (!cls) { res.status(404).json({ error: "Not found" }); return; }

  const user = req.authUser;
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (user.role === "student") {
    if (!cls.courseId) {
      res.status(403).json({ error: "You do not have access to this live class" });
      return;
    }

    const assignedCourseIds = await getStudentAssignedCourseIds(user.id);

    if (!assignedCourseIds.includes(cls.courseId)) {
      res.status(403).json({ error: "You do not have access to this live class" });
      return;
    }
  }

  res.json({ joinUrl: cls.joinUrl ?? "https://meet.google.com/braintam-live" });
});

export default router;
