import { Router } from "express";
import { db } from "@workspace/db";
import { liveClassesTable, subjectsTable, enrollmentsTable } from "@workspace/db";
import { ListLiveClassesQueryParams, GetLiveClassParams, JoinLiveClassParams } from "@workspace/api-zod";
import { eq, and, inArray } from "drizzle-orm";
import { attachUser } from "../middlewares/auth.js";

const router = Router();

router.get("/live-classes", attachUser, async (req, res) => {
  const parsed = ListLiveClassesQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const user = req.authUser;

  let studentFilter: ReturnType<typeof inArray> | ReturnType<typeof eq> | undefined;
  if (user && user.role === "student") {
    const enrolled = await db.select({ courseId: enrollmentsTable.courseId })
      .from(enrollmentsTable).where(eq(enrollmentsTable.studentId, user.id));
    const enrolledIds = enrolled.map(e => e.courseId);
    if (enrolledIds.length > 0) {
      studentFilter = inArray(liveClassesTable.courseId, enrolledIds);
    } else {
      res.json([]);
      return;
    }
  } else if (!user) {
    res.json([]);
    return;
  }

  const classes = await db.select({
    id: liveClassesTable.id,
    title: liveClassesTable.title,
    subjectId: liveClassesTable.subjectId,
    subjectName: subjectsTable.name,
    grade: liveClassesTable.grade,
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

router.get("/live-classes/:id", async (req, res) => {
  const parsed = GetLiveClassParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [cls] = await db.select({
    id: liveClassesTable.id,
    title: liveClassesTable.title,
    subjectId: liveClassesTable.subjectId,
    subjectName: subjectsTable.name,
    grade: liveClassesTable.grade,
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
  res.json({ ...cls, scheduledAt: cls.scheduledAt.toISOString(), teacherAvatar: cls.teacherAvatar ?? null, thumbnailUrl: cls.thumbnailUrl ?? null, studentsJoined: cls.studentsJoined ?? 0 });
});

router.post("/live-classes/:id/join", async (req, res) => {
  const parsed = JoinLiveClassParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [cls] = await db.select().from(liveClassesTable).where(eq(liveClassesTable.id, parsed.data.id));
  if (!cls) { res.status(404).json({ error: "Not found" }); return; }

  res.json({ joinUrl: cls.joinUrl ?? "https://meet.google.com/braintam-live" });
});

export default router;
