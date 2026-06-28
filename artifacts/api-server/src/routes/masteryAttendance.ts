import { Router } from "express";
import { db } from "@workspace/db";
import {
  attendanceTable,
  liveClassesTable,
  masteryStudentsTable,
} from "@workspace/db";
import { eq, and, gte, lt, sql, count } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOrMentor = requireRole("admin", "super_admin", "mentor");

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function tomorrowStart(): Date {
  const d = todayStart();
  d.setDate(d.getDate() + 1);
  return d;
}

function calcPct(present: unknown, total: unknown): number {
  const p = Number(present ?? 0);
  const t = Number(total ?? 0);
  return t > 0 ? Math.round((p / t) * 100) : 0;
}

// ── GET /admin/mastery/attendance/overview ───────────────────────────────────
router.get("/admin/mastery/attendance/overview", adminOrMentor, async (req, res) => {
  const days = Math.max(7, Math.min(365, Number(req.query.days ?? 30)));
  const since = daysAgo(days);
  const today = todayStart();
  const tomorrow = tomorrowStart();
  const weekAgo = daysAgo(7);
  const monthAgo = daysAgo(30);

  const [todayStats, weekStats, periodStats, classesConducted, studentRates] = await Promise.all([
    // Today's attendance
    db.select({ total: count(), present: sql<number>`SUM(CASE WHEN ${attendanceTable.present} = true THEN 1 ELSE 0 END)` })
      .from(attendanceTable)
      .innerJoin(liveClassesTable, eq(attendanceTable.liveClassId, liveClassesTable.id))
      .where(and(gte(liveClassesTable.scheduledAt, today), lt(liveClassesTable.scheduledAt, tomorrow))),

    // This week's attendance
    db.select({ total: count(), present: sql<number>`SUM(CASE WHEN ${attendanceTable.present} = true THEN 1 ELSE 0 END)` })
      .from(attendanceTable)
      .innerJoin(liveClassesTable, eq(attendanceTable.liveClassId, liveClassesTable.id))
      .where(gte(liveClassesTable.scheduledAt, weekAgo)),

    // Selected period attendance
    db.select({ total: count(), present: sql<number>`SUM(CASE WHEN ${attendanceTable.present} = true THEN 1 ELSE 0 END)` })
      .from(attendanceTable)
      .innerJoin(liveClassesTable, eq(attendanceTable.liveClassId, liveClassesTable.id))
      .where(gte(liveClassesTable.scheduledAt, since)),

    // Classes conducted
    db.select({ total: count(), conducted: sql<number>`SUM(CASE WHEN ${liveClassesTable.status} = 'completed' THEN 1 ELSE 0 END)` })
      .from(liveClassesTable)
      .where(gte(liveClassesTable.scheduledAt, since)),

    // Per-student attendance rates for below-75%
    db.select({
      studentId: attendanceTable.studentId,
      total: count(),
      present: sql<number>`SUM(CASE WHEN ${attendanceTable.present} = true THEN 1 ELSE 0 END)`,
    })
      .from(attendanceTable)
      .innerJoin(liveClassesTable, eq(attendanceTable.liveClassId, liveClassesTable.id))
      .where(gte(liveClassesTable.scheduledAt, monthAgo))
      .groupBy(attendanceTable.studentId),
  ]);

  const below75 = studentRates.filter(s => calcPct(s.present, s.total) < 75).length;
  const chronic = studentRates.filter(s => Number(s.total) >= 3 && calcPct(s.present, s.total) < 60).length;

  // Daily trend — single SQL query with date_trunc
  const trendRows = await db.execute(sql`
    SELECT
      DATE(lc.scheduled_at AT TIME ZONE 'Asia/Kolkata') AS day,
      COUNT(*) AS total,
      SUM(CASE WHEN a.present = true THEN 1 ELSE 0 END) AS present
    FROM ${attendanceTable} a
    INNER JOIN ${liveClassesTable} lc ON a.live_class_id = lc.id
    WHERE lc.scheduled_at >= ${since}
    GROUP BY DATE(lc.scheduled_at AT TIME ZONE 'Asia/Kolkata')
    ORDER BY 1
  `);

  const trend = (trendRows.rows as { day: string; total: string; present: string }[]).map(r => ({
    date: String(r.day).slice(0, 10),
    present: Number(r.present),
    absent: Number(r.total) - Number(r.present),
    rate: calcPct(r.present, r.total),
  }));

  // Weekly aggregation for line chart (last 12 weeks)
  const weeklyRows = await db.execute(sql`
    SELECT
      DATE_TRUNC('week', lc.scheduled_at AT TIME ZONE 'Asia/Kolkata') AS week,
      COUNT(*) AS total,
      SUM(CASE WHEN a.present = true THEN 1 ELSE 0 END) AS present
    FROM ${attendanceTable} a
    INNER JOIN ${liveClassesTable} lc ON a.live_class_id = lc.id
    WHERE lc.scheduled_at >= NOW() - INTERVAL '12 weeks'
    GROUP BY DATE_TRUNC('week', lc.scheduled_at AT TIME ZONE 'Asia/Kolkata')
    ORDER BY 1
  `);

  const weekly = (weeklyRows.rows as { week: string; total: string; present: string }[]).map(r => ({
    week: String(r.week).slice(0, 10),
    rate: calcPct(r.present, r.total),
    present: Number(r.present),
    absent: Number(r.total) - Number(r.present),
  }));

  const ts = todayStats[0] ?? { total: 0, present: 0 };
  const ws = weekStats[0] ?? { total: 0, present: 0 };
  const ps = periodStats[0] ?? { total: 0, present: 0 };
  const cc = classesConducted[0] ?? { total: 0, conducted: 0 };

  res.json({
    todayPct:   calcPct(ts.present, ts.total),
    weeklyPct:  calcPct(ws.present, ws.total),
    monthlyPct: calcPct(ps.present, ps.total),
    below75,
    chronic,
    classesConducted: Number(cc.conducted ?? 0),
    classesMissed:    Number(ps.total ?? 0) - Number(ps.present ?? 0),
    trend,
    weekly,
  });
});

// ── GET /admin/mastery/attendance/mentor-wise ────────────────────────────────
router.get("/admin/mastery/attendance/mentor-wise", adminOrMentor, async (req, res) => {
  const days = Math.max(1, Number(req.query.days ?? 30));
  const since = daysAgo(days);

  const rows = await db.execute(sql`
    SELECT
      ms.mentor_id            AS "mentorId",
      ms.mentor_name          AS "mentorName",
      COUNT(DISTINCT ms.id)   AS "students",
      COUNT(a.id)             AS "totalRecords",
      SUM(CASE WHEN a.present = true THEN 1 ELSE 0 END) AS "presentRecords",
      SUM(CASE WHEN
        a.id IS NOT NULL AND
        COUNT(a.id) OVER (PARTITION BY ms.mentor_id, a.student_id) > 0 AND
        (SUM(CASE WHEN a.present = true THEN 1 ELSE 0 END) OVER (PARTITION BY ms.mentor_id, a.student_id)::float /
         NULLIF(COUNT(a.id) OVER (PARTITION BY ms.mentor_id, a.student_id), 0)) < 0.75
      THEN 1 ELSE 0 END)::int AS "belowThreshold"
    FROM ${masteryStudentsTable} ms
    LEFT JOIN ${attendanceTable} a ON a.student_id = ms.student_id
    LEFT JOIN ${liveClassesTable} lc ON a.live_class_id = lc.id AND lc.scheduled_at >= ${since}
    WHERE ms.mastery_status = 'Active' AND ms.mentor_id IS NOT NULL
    GROUP BY ms.mentor_id, ms.mentor_name
    ORDER BY ms.mentor_name
  `);

  const result = (rows.rows as Record<string, unknown>[]).map(r => ({
    mentorId:       Number(r.mentorId),
    mentorName:     String(r.mentorName ?? ""),
    students:       Number(r.students ?? 0),
    totalRecords:   Number(r.totalRecords ?? 0),
    presentRecords: Number(r.presentRecords ?? 0),
    attendancePct:  calcPct(r.presentRecords, r.totalRecords),
    belowThreshold: Number(r.belowThreshold ?? 0),
  }));

  res.json(result);
});

// ── GET /admin/mastery/attendance/grade-wise ─────────────────────────────────
router.get("/admin/mastery/attendance/grade-wise", adminOrMentor, async (req, res) => {
  const days = Math.max(1, Number(req.query.days ?? 30));
  const since = daysAgo(days);

  const rows = await db.execute(sql`
    SELECT
      ms.grade                AS grade,
      COUNT(DISTINCT ms.id)   AS students,
      COUNT(a.id)             AS "totalRecords",
      SUM(CASE WHEN a.present = true THEN 1 ELSE 0 END) AS "presentRecords"
    FROM ${masteryStudentsTable} ms
    LEFT JOIN ${attendanceTable} a ON a.student_id = ms.student_id
    LEFT JOIN ${liveClassesTable} lc ON a.live_class_id = lc.id AND lc.scheduled_at >= ${since}
    WHERE ms.mastery_status = 'Active'
    GROUP BY ms.grade
    ORDER BY ms.grade
  `);

  const result = (rows.rows as Record<string, unknown>[]).map(r => ({
    grade:          Number(r.grade ?? 0),
    students:       Number(r.students ?? 0),
    totalRecords:   Number(r.totalRecords ?? 0),
    presentRecords: Number(r.presentRecords ?? 0),
    attendancePct:  calcPct(r.presentRecords, r.totalRecords),
  }));

  res.json(result);
});

// ── GET /admin/mastery/attendance/risk-students ───────────────────────────────
router.get("/admin/mastery/attendance/risk-students", adminOrMentor, async (req, res) => {
  const days = Math.max(7, Number(req.query.days ?? 30));
  const since = daysAgo(days);
  const threshold = Math.min(100, Number(req.query.threshold ?? 75));

  const rows = await db.execute(sql`
    SELECT
      ms.id              AS "masteryId",
      ms.student_name    AS name,
      ms.phone,
      ms.grade,
      ms.mentor_name     AS "mentorName",
      ms.mastery_status  AS status,
      COUNT(a.id)        AS total,
      SUM(CASE WHEN a.present = true THEN 1 ELSE 0 END) AS present
    FROM ${masteryStudentsTable} ms
    LEFT JOIN ${attendanceTable} a ON a.student_id = ms.student_id
    LEFT JOIN ${liveClassesTable} lc ON a.live_class_id = lc.id AND lc.scheduled_at >= ${since}
    WHERE ms.mastery_status = 'Active'
    GROUP BY ms.id, ms.student_name, ms.phone, ms.grade, ms.mentor_name, ms.mastery_status
    HAVING COUNT(a.id) > 0 AND
      (SUM(CASE WHEN a.present = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(a.id), 0)) * 100 < ${threshold}
    ORDER BY (SUM(CASE WHEN a.present = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(a.id), 0)) ASC
    LIMIT 50
  `);

  const result = (rows.rows as Record<string, unknown>[]).map(r => ({
    masteryId:   Number(r.masteryId),
    name:        String(r.name ?? ""),
    phone:       String(r.phone ?? ""),
    grade:       Number(r.grade ?? 0),
    mentorName:  String(r.mentorName ?? ""),
    status:      String(r.status ?? ""),
    total:       Number(r.total ?? 0),
    present:     Number(r.present ?? 0),
    attendancePct: calcPct(r.present, r.total),
  }));

  res.json(result);
});

export default router;
