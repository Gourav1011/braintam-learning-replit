import { Router } from "express";
import { db } from "@workspace/db";
import { recordingsTable, subjectsTable } from "@workspace/db";
import { ListRecordingsQueryParams, GetRecordingParams } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { attachUser } from "../middlewares/auth.js";

const router = Router();

router.get("/recordings", attachUser, async (req, res) => {
  const parsed = ListRecordingsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const user = req.authUser;

  let gradeFilter: ReturnType<typeof eq> | undefined;
  if (user && user.role === "student") {
    if (!user.grade) { res.json([]); return; }
    gradeFilter = eq(recordingsTable.grade, user.grade);
  }

  const recs = await db.select({
    id: recordingsTable.id,
    title: recordingsTable.title,
    subjectId: recordingsTable.subjectId,
    subjectName: subjectsTable.name,
    grade: recordingsTable.grade,
    recordedAt: recordingsTable.recordedAt,
    teacher: recordingsTable.teacher,
    videoUrl: recordingsTable.videoUrl,
    duration: recordingsTable.duration,
    thumbnailUrl: recordingsTable.thumbnailUrl,
    views: recordingsTable.views,
  })
    .from(recordingsTable)
    .innerJoin(subjectsTable, eq(recordingsTable.subjectId, subjectsTable.id))
    .where(
      and(
        gradeFilter,
        params.grade ? eq(recordingsTable.grade, params.grade) : undefined,
        params.subjectId ? eq(recordingsTable.subjectId, params.subjectId) : undefined,
      )
    );

  res.json(recs.map(r => ({ ...r, recordedAt: r.recordedAt.toISOString(), thumbnailUrl: r.thumbnailUrl ?? null, views: r.views ?? 0 })));
});

router.get("/recordings/:id", async (req, res) => {
  const parsed = GetRecordingParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [rec] = await db.select({
    id: recordingsTable.id,
    title: recordingsTable.title,
    subjectId: recordingsTable.subjectId,
    subjectName: subjectsTable.name,
    grade: recordingsTable.grade,
    recordedAt: recordingsTable.recordedAt,
    teacher: recordingsTable.teacher,
    videoUrl: recordingsTable.videoUrl,
    duration: recordingsTable.duration,
    thumbnailUrl: recordingsTable.thumbnailUrl,
    views: recordingsTable.views,
  })
    .from(recordingsTable)
    .innerJoin(subjectsTable, eq(recordingsTable.subjectId, subjectsTable.id))
    .where(eq(recordingsTable.id, parsed.data.id));

  if (!rec) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...rec, recordedAt: rec.recordedAt.toISOString(), thumbnailUrl: rec.thumbnailUrl ?? null, views: rec.views ?? 0 });
});

export default router;
