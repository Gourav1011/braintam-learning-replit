import { Router } from "express";
import { db } from "@workspace/db";
import { subjectsTable } from "@workspace/db";
import { ListSubjectsQueryParams } from "@workspace/api-zod";
import { and, gte, lte } from "drizzle-orm";

const router = Router();

router.get("/subjects", async (req, res) => {
  const parsed = ListSubjectsQueryParams.safeParse(req.query);
  const grade = parsed.success ? parsed.data.grade : undefined;

  let query = db.select().from(subjectsTable);
  if (grade) {
    const subjects = await db.select().from(subjectsTable)
      .where(and(lte(subjectsTable.gradeFrom, grade), gte(subjectsTable.gradeTo, grade)));
    res.json(subjects.map(s => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      color: s.color,
      description: s.description ?? null,
    })));
    return;
  }
  const subjects = await query;
  res.json(subjects.map(s => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    color: s.color,
    description: s.description ?? null,
  })));
});

export default router;
