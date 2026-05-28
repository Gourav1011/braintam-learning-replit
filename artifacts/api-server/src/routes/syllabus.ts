import { Router } from "express";
import { db } from "@workspace/db";
import {
  coursesTable, subjectsTable, chaptersTable, topicsTable,
  liveClassesTable, recordingsTable, homeworkTable, assignmentsTable, testsTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

// GET /course-syllabus/:courseId — nested Course → Chapters → Topics → Content
router.get("/course-syllabus/:courseId", async (req, res) => {
  const courseId = Number(req.params.courseId);
  if (!courseId) { res.status(400).json({ error: "Invalid courseId" }); return; }

  const [course] = await db
    .select({
      id: coursesTable.id,
      title: coursesTable.title,
      grade: coursesTable.grade,
      board: coursesTable.board,
      description: coursesTable.description,
      thumbnailUrl: coursesTable.thumbnailUrl,
      teacher: coursesTable.teacher,
      rating: coursesTable.rating,
      subjectName: subjectsTable.name,
      subjectId: coursesTable.subjectId,
      totalLessons: coursesTable.totalLessons,
    })
    .from(coursesTable)
    .leftJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
    .where(eq(coursesTable.id, courseId));

  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const chapters = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.courseId, courseId))
    .orderBy(chaptersTable.order);

  if (chapters.length === 0) {
    res.json({ course, chapters: [] });
    return;
  }

  const chapterIds = chapters.map(c => c.id);

  const allTopics = await db
    .select()
    .from(topicsTable)
    .where(inArray(topicsTable.chapterId, chapterIds))
    .orderBy(topicsTable.order);

  const topicsMap: Record<number, typeof allTopics> = {};
  for (const topic of allTopics) {
    if (!topicsMap[topic.chapterId]) topicsMap[topic.chapterId] = [];
    topicsMap[topic.chapterId].push(topic);
  }

  const topicIds = allTopics.map(t => t.id);

  if (topicIds.length === 0) {
    const result = chapters.map(ch => ({ ...ch, topics: [] }));
    res.json({ course, chapters: result });
    return;
  }

  const [lcs, recs, hws, asns, tsts] = await Promise.all([
    db.select().from(liveClassesTable).where(and(inArray(liveClassesTable.topicId, topicIds), eq(liveClassesTable.isPublished, true))),
    db.select().from(recordingsTable).where(and(inArray(recordingsTable.topicId, topicIds), eq(recordingsTable.isPublished, true))),
    db.select().from(homeworkTable).where(and(inArray(homeworkTable.topicId, topicIds), eq(homeworkTable.isPublished, true))),
    db.select().from(assignmentsTable).where(and(inArray(assignmentsTable.topicId, topicIds), eq(assignmentsTable.isPublished, true))),
    db.select().from(testsTable).where(and(inArray(testsTable.topicId, topicIds), eq(testsTable.isPublished, true))),
  ]);

  type ContentItem = Record<string, unknown> & { contentType: string; _sortKey: number };
  const contentMap: Record<number, ContentItem[]> = {};
  const addContent = (items: Record<string, unknown>[], type: string, dateField: string) => {
    for (const item of items) {
      const tid = item.topicId as number;
      if (!tid) continue;
      if (!contentMap[tid]) contentMap[tid] = [];
      contentMap[tid].push({ ...item, contentType: type, _sortKey: new Date((item[dateField] as string) ?? (item.createdAt as string)).getTime() });
    }
  };
  addContent(lcs as Record<string, unknown>[], "LIVE_CLASS", "scheduledAt");
  addContent(recs as Record<string, unknown>[], "RECORDING", "recordedAt");
  addContent(hws as Record<string, unknown>[], "HOMEWORK", "dueDate");
  addContent(asns as Record<string, unknown>[], "ASSIGNMENT", "dueDate");
  addContent(tsts as Record<string, unknown>[], "TEST", "createdAt");

  const syllabusChapters = chapters.map(chapter => ({
    ...chapter,
    topics: (topicsMap[chapter.id] ?? []).map(topic => ({
      ...topic,
      content: (contentMap[topic.id] ?? []).sort((a, b) => a._sortKey - b._sortKey),
    })),
  }));

  res.json({ course, chapters: syllabusChapters });
});

export default router;
