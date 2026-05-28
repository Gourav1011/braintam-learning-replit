import { Router } from "express";
import { db } from "@workspace/db";
import { coursesTable, subjectsTable, lessonsTable } from "@workspace/db";
import { ListCoursesQueryParams, GetCourseParams } from "@workspace/api-zod";
import { eq, and, ilike } from "drizzle-orm";
import { attachUser } from "../middlewares/auth.js";

const router = Router();

router.get("/courses", attachUser, async (req, res) => {
  const parsed = ListCoursesQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const user = req.authUser;

  let gradeFilter: ReturnType<typeof eq> | undefined;
  if (user && user.role === "student") {
    if (!user.grade) {
      res.json([]);
      return;
    }
    gradeFilter = eq(coursesTable.grade, user.grade);
  }

  const courses = await db.select({
    id: coursesTable.id,
    title: coursesTable.title,
    subjectId: coursesTable.subjectId,
    subjectName: subjectsTable.name,
    grade: coursesTable.grade,
    totalLessons: coursesTable.totalLessons,
    thumbnailUrl: coursesTable.thumbnailUrl,
    description: coursesTable.description,
    teacher: coursesTable.teacher,
    rating: coursesTable.rating,
  })
    .from(coursesTable)
    .innerJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
    .where(
      and(
        gradeFilter,
        params.grade ? eq(coursesTable.grade, params.grade) : undefined,
        params.subjectId ? eq(coursesTable.subjectId, params.subjectId) : undefined,
        params.search ? ilike(coursesTable.title, `%${params.search}%`) : undefined,
      )
    );

  res.json(courses.map(c => ({
    ...c,
    completedLessons: null,
    description: c.description ?? null,
    teacher: c.teacher ?? null,
    rating: c.rating ?? null,
    thumbnailUrl: c.thumbnailUrl ?? null,
  })));
});

router.get("/courses/:id", attachUser, async (req, res) => {
  const parsed = GetCourseParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const user = req.authUser;
  if (user && user.role === "student" && user.grade) {
    const [course] = await db.select({ grade: coursesTable.grade }).from(coursesTable).where(eq(coursesTable.id, parsed.data.id));
    if (course && course.grade !== user.grade) {
      res.status(403).json({ error: "This course is not available for your grade" });
      return;
    }
  }

  const [course] = await db.select({
    id: coursesTable.id,
    title: coursesTable.title,
    subjectId: coursesTable.subjectId,
    subjectName: subjectsTable.name,
    grade: coursesTable.grade,
    thumbnailUrl: coursesTable.thumbnailUrl,
    description: coursesTable.description,
    teacher: coursesTable.teacher,
    rating: coursesTable.rating,
  })
    .from(coursesTable)
    .innerJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
    .where(eq(coursesTable.id, parsed.data.id));

  if (!course) { res.status(404).json({ error: "Not found" }); return; }

  const lessons = await db.select().from(lessonsTable)
    .where(eq(lessonsTable.courseId, parsed.data.id))
    .orderBy(lessonsTable.order);

  res.json({
    ...course,
    description: course.description ?? null,
    teacher: course.teacher ?? null,
    rating: course.rating ?? null,
    thumbnailUrl: course.thumbnailUrl ?? null,
    lessons: lessons.map(l => ({
      id: l.id,
      title: l.title,
      duration: l.duration,
      order: l.order,
      videoUrl: l.videoUrl ?? null,
      completed: false,
    })),
  });
});

export default router;
