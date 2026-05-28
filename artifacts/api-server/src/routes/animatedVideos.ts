import { Router } from "express";
import { db } from "@workspace/db";
import { animatedVideosTable, subjectsTable } from "@workspace/db";
import { ListAnimatedVideosQueryParams, GetAnimatedVideoParams } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { attachUser } from "../middlewares/auth.js";

const router = Router();

router.get("/animated-videos", attachUser, async (req, res) => {
  const parsed = ListAnimatedVideosQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const user = req.authUser;

  let gradeFilter: ReturnType<typeof eq> | undefined;
  if (user && user.role === "student") {
    if (!user.grade) { res.json([]); return; }
    gradeFilter = eq(animatedVideosTable.grade, user.grade);
  }

  const vids = await db.select({
    id: animatedVideosTable.id,
    title: animatedVideosTable.title,
    subjectId: animatedVideosTable.subjectId,
    subjectName: subjectsTable.name,
    grade: animatedVideosTable.grade,
    videoUrl: animatedVideosTable.videoUrl,
    duration: animatedVideosTable.duration,
    thumbnailUrl: animatedVideosTable.thumbnailUrl,
    description: animatedVideosTable.description,
    views: animatedVideosTable.views,
  })
    .from(animatedVideosTable)
    .innerJoin(subjectsTable, eq(animatedVideosTable.subjectId, subjectsTable.id))
    .where(
      and(
        gradeFilter,
        params.grade ? eq(animatedVideosTable.grade, params.grade) : undefined,
        params.subjectId ? eq(animatedVideosTable.subjectId, params.subjectId) : undefined,
      )
    );

  res.json(vids.map(v => ({ ...v, description: v.description ?? null, views: v.views ?? 0 })));
});

router.get("/animated-videos/:id", async (req, res) => {
  const parsed = GetAnimatedVideoParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [vid] = await db.select({
    id: animatedVideosTable.id,
    title: animatedVideosTable.title,
    subjectId: animatedVideosTable.subjectId,
    subjectName: subjectsTable.name,
    grade: animatedVideosTable.grade,
    videoUrl: animatedVideosTable.videoUrl,
    duration: animatedVideosTable.duration,
    thumbnailUrl: animatedVideosTable.thumbnailUrl,
    description: animatedVideosTable.description,
    views: animatedVideosTable.views,
  })
    .from(animatedVideosTable)
    .innerJoin(subjectsTable, eq(animatedVideosTable.subjectId, subjectsTable.id))
    .where(eq(animatedVideosTable.id, parsed.data.id));

  if (!vid) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...vid, description: vid.description ?? null, views: vid.views ?? 0 });
});

export default router;
