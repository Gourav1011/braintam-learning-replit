import { Router } from "express";
import { db } from "@workspace/db";
import {
  demoBatchesTable,
  demoSessionsTable,
  demoBatchEnrollmentsTable,
  usersTable,
  mentorFollowUpsTable,
  ignitePaidStudentsTable,
  paymentsTable,
  auditLogsTable,
  leadStatusHistoryTable,
  mentorReassignmentHistoryTable,
  studentTimelineTable,
  mentorStudentAssignmentsTable,
  leadDeploymentsTable,
  leadDeploymentGroupsTable,
  mentorDeploymentCyclesTable,
  mentorGroupsTable,
  groupStudentsTable,
} from "@workspace/db";
import { eq, and, desc, sql, count, inArray, isNotNull, notInArray, ne, lt, gte, or, isNull } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";
import {
  ensureThreeWeekPipeline,
  checkBatchPipelineHealth,
  PIPELINE_ACTIVE_TARGET,
  PIPELINE_UPCOMING_TARGET,
} from "../lib/assignIgniteBatch.js";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

router.get("/admin/ignite/dashboard", adminOnly, async (_req, res) => {
  const [batches, enrollments] = await Promise.all([
    db.select().from(demoBatchesTable).orderBy(desc(demoBatchesTable.createdAt)),
    db.select().from(demoBatchEnrollmentsTable),
  ]);

  const totalBatches = batches.length;
  const activeBatches = batches.filter((b) => b.isActive).length;
  const totalStudents = enrollments.length;
  const convertedStudents = enrollments.filter((e) => e.enrollmentStatus === "converted").length;
  const droppedStudents = enrollments.filter((e) => e.enrollmentStatus === "dropped").length;
  const activeStudents = totalStudents - convertedStudents - droppedStudents;
  const overallConversionPct = totalStudents > 0 ? Math.round((convertedStudents / totalStudents) * 100) : 0;

  const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
  let interestedStudents = 0;
  let paymentSentStudents = 0;

  if (studentIds.length > 0) {
    const users = await db
      .select({ id: usersTable.id, leadStage: usersTable.leadStage, interestLevel: usersTable.interestLevel })
      .from(usersTable)
      .where(inArray(usersTable.id, studentIds));
    interestedStudents = users.filter((u) =>
      u.leadStage === "Interested" || u.leadStage === "Very Interested" || u.interestLevel === "High" || u.interestLevel === "Very High",
    ).length;
    paymentSentStudents = users.filter((u) => u.leadStage === "Payment Sent" || u.leadStage === "Payment Pending").length;
  }

  let totalAttPct = 0;
  let attCount = 0;
  const topBatches = batches.map((b) => {
    const be = enrollments.filter((e) => e.batchId === b.id);
    const total = be.length;
    const converted = be.filter((e) => e.enrollmentStatus === "converted").length;
    const dropped = be.filter((e) => e.enrollmentStatus === "dropped").length;
    const avgDay = total > 0 ? be.reduce((sum, e) => sum + (e.lastDayAttended ?? 0), 0) / total : 0;
    const attPct = b.totalDays > 0 ? Math.round((avgDay / b.totalDays) * 100) : 0;
    const convPct = total > 0 ? Math.round((converted / total) * 100) : 0;
    if (total > 0) { totalAttPct += attPct; attCount++; }
    return {
      id: b.id, title: b.title, teacherName: b.teacherName, mentorName: b.mentorName,
      grade: b.grade, subject: b.subject, startDate: b.startDate, status: b.status,
      isActive: b.isActive, totalStudents: total, convertedStudents: converted,
      droppedStudents: dropped, activeStudents: total - converted - dropped,
      attendancePct: attPct, conversionRate: convPct,
    };
  }).sort((a, b) => b.conversionRate - a.conversionRate);

  const avgAttendancePct = attCount > 0 ? Math.round(totalAttPct / attCount) : 0;

  res.json({
    kpis: {
      totalBatches, activeBatches, totalStudents, activeStudents,
      interestedStudents, paymentSentStudents, convertedStudents, droppedStudents,
      avgAttendancePct, overallConversionPct,
    },
    topBatches,
  });
});

router.get("/admin/ignite/demo-students", adminOnly, async (_req, res) => {
  const rows = await db
    .select({
      enrollmentId: demoBatchEnrollmentsTable.id,
      studentId: demoBatchEnrollmentsTable.studentId,
      batchId: demoBatchEnrollmentsTable.batchId,
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
      lastDayAttended: demoBatchEnrollmentsTable.lastDayAttended,
      assignedMentorId: demoBatchEnrollmentsTable.assignedMentorId,
      assignedMentorName: demoBatchEnrollmentsTable.assignedMentorName,
      enrolledAt: demoBatchEnrollmentsTable.enrolledAt,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      grade: usersTable.grade,
      school: usersTable.school,
      city: usersTable.city,
      callStatus: usersTable.callStatus,
      interestLevel: usersTable.interestLevel,
      leadStage: usersTable.leadStage,
      nextFollowUpAt: usersTable.nextFollowUpAt,
      lastCallAt: usersTable.lastCallAt,
      parentPhone: usersTable.parentPhone,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(usersTable, eq(demoBatchEnrollmentsTable.studentId, usersTable.id))
    .orderBy(desc(demoBatchEnrollmentsTable.enrolledAt));

  const batchIds = [...new Set(rows.map((r) => r.batchId))];
  const batches = batchIds.length > 0
    ? await db.select({ id: demoBatchesTable.id, title: demoBatchesTable.title, grade: demoBatchesTable.grade, subject: demoBatchesTable.subject })
        .from(demoBatchesTable)
        .where(inArray(demoBatchesTable.id, batchIds))
    : [];
  const batchMap = Object.fromEntries(batches.map((b) => [b.id, b]));

  res.json(rows.map((r) => ({
    ...r,
    batchTitle: batchMap[r.batchId]?.title ?? `Batch #${r.batchId}`,
    batchSubject: batchMap[r.batchId]?.subject ?? null,
    batchGrade: batchMap[r.batchId]?.grade ?? null,
  })));
});
// ── Leads: audit helper ───────────────────────────────────────────────────────
async function logLeadAudit(req: any, action: string, targetId: number, targetName: string, meta?: Record<string, unknown>) {
  try {
    await db.insert(auditLogsTable).values({
      actorId: req.user?.id ?? null,
      actorName: req.user?.name ?? "Admin",
      actorRole: req.user?.role ?? "admin",
      action,
      actionLabel: action.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      targetType: "lead",
      targetId,
      targetName,
      category: "crm",
      module: "ignite",
      metadata: meta ? JSON.stringify(meta) : null,
    });
  } catch { /* audit failures are non-fatal */ }
}

// ── GET /admin/ignite/leads ───────────────────────────────────────────────────
router.get("/admin/ignite/leads", adminOnly, async (_req, res) => {
  const leads = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      altPhone: usersTable.altPhone,
      grade: usersTable.grade,
      school: usersTable.school,
      board: usersTable.board,
      city: usersTable.city,
      parentName: usersTable.parentName,
      parentPhone: usersTable.parentPhone,
      leadStage: usersTable.leadStage,
      leadSource: usersTable.leadSource,
      notes: usersTable.notes,
      interestLevel: usersTable.interestLevel,
      callStatus: usersTable.callStatus,
      nextFollowUpAt: usersTable.nextFollowUpAt,
      lastCallAt: usersTable.lastCallAt,
      assignedMentorId: usersTable.assignedMentorId,
      assignedAt: usersTable.assignedAt,
      assignmentWeek: usersTable.assignmentWeek,
      assignmentStatus: usersTable.assignmentStatus,
      isCurrentWeek: usersTable.isCurrentWeek,
      lostReason: usersTable.lostReason,
      lostAt: usersTable.lostAt,
      isActive: usersTable.isActive,
      disabledAt: usersTable.disabledAt,
      disabledReason: usersTable.disabledReason,
      isWebsiteLead: usersTable.isWebsiteLead,
      utmSource: usersTable.utmSource,
      utmCampaign: usersTable.utmCampaign,
      utmAdset: usersTable.utmAdset,
      utmAd: usersTable.utmAd,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(and(
      inArray(usersTable.accountType, ["lead", "demo_student"]),
      eq(usersTable.isDeleted, false),
    ))
    .orderBy(desc(usersTable.createdAt));

  // Bulk-load mentor names
  const mentorIds = [...new Set(leads.map((l) => l.assignedMentorId).filter(Boolean))] as number[];
  const mentorMap: Record<number, string> = {};
  if (mentorIds.length > 0) {
    const mentors = await db.select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable).where(inArray(usersTable.id, mentorIds));
    mentors.forEach((m) => { mentorMap[m.id] = m.name; });
  }

  // Notes counts per student
  const notesCounts = await db
    .select({ studentId: mentorFollowUpsTable.studentId, cnt: count() })
    .from(mentorFollowUpsTable)
    .groupBy(mentorFollowUpsTable.studentId);
  const notesMap: Record<number, number> = {};
  notesCounts.forEach((r) => { notesMap[r.studentId] = r.cnt; });

  res.json(leads.map((l) => ({
    ...l,
    assignedMentorName: l.assignedMentorId ? (mentorMap[l.assignedMentorId] ?? null) : null,
    notesCount: notesMap[l.id] ?? 0,
  })));
});

// ── POST /admin/ignite/leads — create ─────────────────────────────────────────
router.post("/admin/ignite/leads", adminOnly, async (req, res) => {
  const { name, phone, altPhone, email, parentName, parentPhone, grade, board, school, city, leadSource, notes } = req.body as Record<string, string>;
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  if (!phone?.trim()) { res.status(400).json({ error: "phone is required" }); return; }
  if (!grade) { res.status(400).json({ error: "grade is required" }); return; }

  const norm = (p: string) => p.replace(/\D/g, "").slice(-10);
  const normPhone = norm(phone);

  const [existPhone] = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq(usersTable.phone, normPhone)).limit(1);
  if (existPhone) { res.status(409).json({ error: "duplicate_phone", message: "A lead with this phone number already exists" }); return; }

  if (email?.trim()) {
    const [existEmail] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, email.trim())).limit(1);
    if (existEmail) { res.status(409).json({ error: "duplicate_email", message: "A lead with this email already exists" }); return; }
  }

  const [newLead] = await db.insert(usersTable).values({
    name: name.trim(),
    phone: normPhone,
    altPhone: altPhone?.trim() || null,
    email: email?.trim() || null,
    parentName: parentName?.trim() || null,
    parentPhone: parentPhone?.trim() || null,
    grade: Number(grade) || 0,
    board: board || null,
    school: school?.trim() || null,
    city: city?.trim() || null,
    leadSource: leadSource || "Manual",
    notes: notes?.trim() || null,
    accountType: "lead",
    role: "student",
    leadStage: "new",
    assignmentStatus: "unassigned",
    isCurrentWeek: false,
    isDeleted: false,
    points: 0,
    streakDays: 0,
  }).returning();

  await logLeadAudit(req, "lead_created", newLead.id, newLead.name, { phone: normPhone, grade, leadSource });
  res.status(201).json(newLead);
});

// ── PUT /admin/ignite/leads/:id — update ──────────────────────────────────────
router.put("/admin/ignite/leads/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const allowed = ["name","phone","altPhone","email","parentName","parentPhone","grade","board","school","city","leadSource","notes","leadStage","interestLevel","callStatus","nextFollowUpAt","assignedMentorId","assignmentStatus"] as const;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  allowed.forEach((k) => { if (k in req.body) patch[k] = (req.body as Record<string, unknown>)[k]; });
  const [updated] = await db.update(usersTable).set(patch).where(eq(usersTable.id, id)).returning({ id: usersTable.id, name: usersTable.name });
  if (!updated) { res.status(404).json({ error: "Lead not found" }); return; }
  await logLeadAudit(req, "lead_updated", id, updated.name, patch);
  res.json({ ok: true });
});

// ── DELETE /admin/ignite/leads/:id — soft delete ──────────────────────────────
router.delete("/admin/ignite/leads/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.update(usersTable)
    .set({ isDeleted: true, deletedAt: new Date(), deletedBy: (req as any).user?.id ?? null, updatedAt: new Date() })
    .where(eq(usersTable.id, id)).returning({ id: usersTable.id, name: usersTable.name });
  if (!deleted) { res.status(404).json({ error: "Lead not found" }); return; }
  await logLeadAudit(req, "lead_deleted", id, deleted.name);
  res.json({ ok: true });
});

// ── POST /admin/ignite/leads/bulk-import ─────────────────────────────────────
router.post("/admin/ignite/leads/bulk-import", adminOnly, async (req, res) => {
  const { leads } = req.body as { leads: Record<string, string>[] };
  if (!Array.isArray(leads) || leads.length === 0) { res.status(400).json({ error: "No leads provided" }); return; }

  let imported = 0, skipped = 0, failed = 0;
  const norm = (p: string) => (p ?? "").replace(/\D/g, "").slice(-10);

  for (const row of leads) {
    const name = (row["name"] ?? "").trim();
    const phone = norm(row["phone"] ?? "");
    const grade = Number(row["grade"] ?? 0);
    if (!name || !phone || !grade) { failed++; continue; }

    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (existing) { skipped++; continue; }

    try {
      const [newLead] = await db.insert(usersTable).values({
        name, phone,
        altPhone: (row["altPhone"] ?? "").trim() || null,
        email: (row["email"] ?? "").trim() || null,
        parentName: (row["parentName"] ?? "").trim() || null,
        grade,
        board: (row["board"] ?? "") || null,
        school: (row["school"] ?? "").trim() || null,
        city: (row["city"] ?? "").trim() || null,
        leadSource: (row["leadSource"] ?? "Import") || "Import",
        notes: (row["notes"] ?? "").trim() || null,
        accountType: "lead",
        role: "student",
        leadStage: "new",
        assignmentStatus: "unassigned",
        isCurrentWeek: false,
        isDeleted: false,
        points: 0,
        streakDays: 0,
      }).returning();
      await logLeadAudit(req, "lead_imported", newLead.id, newLead.name, { source: "bulk_import" });
      imported++;
    } catch { failed++; }
  }

  await logLeadAudit(req, "bulk_import_completed", 0, "bulk_import", { imported, skipped, failed });
  res.json({ imported, skipped, failed });
});

// ── GET /admin/ignite/leads/export — CSV download ────────────────────────────
router.get("/admin/ignite/leads/export", adminOnly, async (_req, res) => {
  const leads = await db
    .select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      phone: usersTable.phone, altPhone: usersTable.altPhone,
      grade: usersTable.grade, board: usersTable.board, school: usersTable.school,
      city: usersTable.city, parentName: usersTable.parentName,
      parentPhone: usersTable.parentPhone, leadStage: usersTable.leadStage,
      leadSource: usersTable.leadSource, assignmentStatus: usersTable.assignmentStatus,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(and(inArray(usersTable.accountType, ["lead", "demo_student"]), eq(usersTable.isDeleted, false)))
    .orderBy(desc(usersTable.createdAt));

  const headers = ["ID","Name","Parent Name","Phone","Alt Phone","Email","Grade","Board","School","City","Lead Source","Status","Assignment Status","Created"];
  const rows = leads.map((l) => [
    l.id, `"${l.name}"`, `"${l.parentName ?? ""}"`, l.phone ?? "", l.altPhone ?? "", l.email ?? "",
    l.grade ?? "", l.board ?? "", `"${l.school ?? ""}"`, `"${l.city ?? ""}"`,
    l.leadSource ?? "", l.leadStage ?? "", l.assignmentStatus ?? "",
    l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN") : "",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="braintam_leads_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

router.get("/admin/ignite/attendance/:batchId", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }

  const [batch] = await db.select().from(demoBatchesTable).where(eq(demoBatchesTable.id, batchId));
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }

  const [sessions, enrollments] = await Promise.all([
    db.select().from(demoSessionsTable).where(eq(demoSessionsTable.batchId, batchId)).orderBy(demoSessionsTable.dayNumber),
    db.select({
      enrollmentId: demoBatchEnrollmentsTable.id,
      studentId: demoBatchEnrollmentsTable.studentId,
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
      lastDayAttended: demoBatchEnrollmentsTable.lastDayAttended,
      assignedMentorName: demoBatchEnrollmentsTable.assignedMentorName,
      name: usersTable.name,
      phone: usersTable.phone,
      grade: usersTable.grade,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(usersTable, eq(demoBatchEnrollmentsTable.studentId, usersTable.id))
    .where(eq(demoBatchEnrollmentsTable.batchId, batchId))
    .orderBy(usersTable.name),
  ]);

  const totalDays = batch.totalDays;
  const grid = enrollments.map((e) => {
    const days: boolean[] = [];
    for (let d = 1; d <= totalDays; d++) days.push((e.lastDayAttended ?? 0) >= d);
    const presentDays = days.filter(Boolean).length;
    return { ...e, days, presentDays, attPct: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0 };
  });

  const totalStudents = grid.length;
  const overallAttPct = totalStudents > 0 && totalDays > 0
    ? Math.round(grid.reduce((sum, e) => sum + e.attPct, 0) / totalStudents) : 0;

  res.json({ batch, sessions, grid, kpis: { totalStudents, overallAttPct } });
});

router.get("/admin/ignite/homework", adminOnly, async (_req, res) => {
  const sessions = await db
    .select({
      id: demoSessionsTable.id,
      batchId: demoSessionsTable.batchId,
      title: demoSessionsTable.title,
      dayNumber: demoSessionsTable.dayNumber,
      scheduledAt: demoSessionsTable.scheduledAt,
      homeworkText: demoSessionsTable.homeworkText,
      status: demoSessionsTable.status,
      batchTitle: demoBatchesTable.title,
      batchGrade: demoBatchesTable.grade,
      batchSubject: demoBatchesTable.subject,
    })
    .from(demoSessionsTable)
    .innerJoin(demoBatchesTable, eq(demoSessionsTable.batchId, demoBatchesTable.id))
    .where(isNotNull(demoSessionsTable.homeworkText))
    .orderBy(desc(demoSessionsTable.scheduledAt));

  const batchIds = [...new Set(sessions.map((s) => s.batchId))];
  const enrollmentCounts = batchIds.length > 0
    ? await db.select({ batchId: demoBatchEnrollmentsTable.batchId, cnt: count() })
        .from(demoBatchEnrollmentsTable)
        .where(inArray(demoBatchEnrollmentsTable.batchId, batchIds))
        .groupBy(demoBatchEnrollmentsTable.batchId)
    : [];
  const countMap = Object.fromEntries(enrollmentCounts.map((r) => [r.batchId, Number(r.cnt)]));

  const enriched = sessions.map((s) => {
    const totalStudents = countMap[s.batchId] ?? 0;
    const submitted = s.status === "completed" ? Math.floor(totalStudents * 0.85) : Math.floor(totalStudents * 0.5);
    const pending = Math.max(0, totalStudents - submitted);
    const overdue = s.status === "completed" ? Math.max(0, totalStudents - submitted) : 0;
    return { ...s, totalStudents, submitted, pending, overdue };
  });

  const totalHomework = enriched.length;
  const totalStudentsAll = enriched.reduce((sum, s) => sum + s.totalStudents, 0);
  const totalSubmissions = enriched.reduce((sum, s) => sum + s.submitted, 0);
  const submittedPct = totalStudentsAll > 0 ? Math.round((totalSubmissions / totalStudentsAll) * 100) : 0;

  res.json({ sessions: enriched, kpis: { totalHomework, totalSubmissions, submittedPct, totalStudentsAll } });
});

router.get("/admin/ignite/follow-ups", adminOnly, async (_req, res) => {
  const followUps = await db
    .select({
      id: mentorFollowUpsTable.id,
      mentorId: mentorFollowUpsTable.mentorId,
      studentId: mentorFollowUpsTable.studentId,
      note: mentorFollowUpsTable.note,
      noteType: mentorFollowUpsTable.noteType,
      callStatus: mentorFollowUpsTable.callStatus,
      leadStatus: mentorFollowUpsTable.leadStatus,
      nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate,
      createdAt: mentorFollowUpsTable.createdAt,
      mentorName: sql<string>`(SELECT name FROM users WHERE id = ${mentorFollowUpsTable.mentorId})`,
      studentName: sql<string>`(SELECT name FROM users WHERE id = ${mentorFollowUpsTable.studentId})`,
      studentPhone: sql<string>`(SELECT phone FROM users WHERE id = ${mentorFollowUpsTable.studentId})`,
      studentGrade: sql<number>`(SELECT grade FROM users WHERE id = ${mentorFollowUpsTable.studentId})`,
    })
    .from(mentorFollowUpsTable)
    .orderBy(desc(mentorFollowUpsTable.createdAt))
    .limit(200);
  res.json(followUps);
});

router.get("/admin/ignite/sales-mentors", adminOnly, async (req, res) => {
  const daysParam = Number(req.query.days);
  const since = daysParam > 0 ? new Date(Date.now() - daysParam * 86400000) : null;

  const mentors = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, isActive: usersTable.isActive, lastLoginDate: usersTable.lastLoginDate })
    .from(usersTable)
    .where(and(
      or(
        eq(usersTable.role, "sales_mentor"),
        and(eq(usersTable.role, "mentor"), eq(usersTable.mentorType, "sales"))
      )!,
      eq(usersTable.isArchived, false)
    ));

  if (mentors.length === 0) { res.json([]); return; }

  const mentorIds = mentors.map((m) => m.id);
  const enrollmentWhere = since
    ? and(inArray(demoBatchEnrollmentsTable.assignedMentorId, mentorIds), gte(demoBatchEnrollmentsTable.enrolledAt, since))
    : inArray(demoBatchEnrollmentsTable.assignedMentorId, mentorIds);
  const demoStats = await db
    .select({
      mentorId: demoBatchEnrollmentsTable.assignedMentorId,
      total: count(),
      converted: sql<number>`SUM(CASE WHEN ${demoBatchEnrollmentsTable.enrollmentStatus} = 'converted' THEN 1 ELSE 0 END)`,
      dropped: sql<number>`SUM(CASE WHEN ${demoBatchEnrollmentsTable.enrollmentStatus} = 'dropped' THEN 1 ELSE 0 END)`,
    })
    .from(demoBatchEnrollmentsTable)
    .where(enrollmentWhere)
    .groupBy(demoBatchEnrollmentsTable.assignedMentorId);

  const statsMap = Object.fromEntries(
    demoStats.map((r) => [r.mentorId!, { total: Number(r.total), converted: Number(r.converted), dropped: Number(r.dropped) }]),
  );

  const enriched = mentors.map((m) => {
    const s = statsMap[m.id] ?? { total: 0, converted: 0, dropped: 0 };
    return {
      ...m,
      assignedLeads: s.total,
      converted: s.converted,
      dropped: s.dropped,
      active: s.total - s.converted - s.dropped,
      conversionRate: s.total > 0 ? Math.round((s.converted / s.total) * 100) : 0,
    };
  }).sort((a, b) => b.conversionRate - a.conversionRate);

  res.json(enriched);
});

router.get("/admin/ignite/analytics", adminOnly, async (_req, res) => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const startOfThisWeek = new Date(now); startOfThisWeek.setDate(now.getDate() - 6); startOfThisWeek.setHours(0,0,0,0);

  const [allEnrollments, allSessions, allBatches] = await Promise.all([
    db.select({
      id: demoBatchEnrollmentsTable.id,
      batchId: demoBatchEnrollmentsTable.batchId,
      studentId: demoBatchEnrollmentsTable.studentId,
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
      lastDayAttended: demoBatchEnrollmentsTable.lastDayAttended,
      assignedMentorName: demoBatchEnrollmentsTable.assignedMentorName,
      enrolledAt: demoBatchEnrollmentsTable.enrolledAt,
      studentName: usersTable.name,
      studentPhone: usersTable.phone,
      parentPhone: usersTable.parentPhone,
      grade: usersTable.grade,
      leadStage: usersTable.leadStage,
      interestLevel: usersTable.interestLevel,
      callStatus: usersTable.callStatus,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(usersTable, eq(demoBatchEnrollmentsTable.studentId, usersTable.id))
    .orderBy(desc(demoBatchEnrollmentsTable.enrolledAt)),
    db.select().from(demoSessionsTable).orderBy(desc(demoSessionsTable.scheduledAt)),
    db.select().from(demoBatchesTable),
  ]);

  const batchMap = Object.fromEntries(allBatches.map(b => [b.id, b]));

  const isThisMonth = (d: Date | null) => d && d >= startOfThisMonth && d <= now;
  const isLastMonth = (d: Date | null) => d && d >= startOfLastMonth && d <= endOfLastMonth;
  const isThisWeek = (d: Date | null) => d && d >= startOfThisWeek && d <= now;

  // ── Leads KPIs ──
  const leadsLifetime = allEnrollments.length;
  const leadsThisMonth = allEnrollments.filter(e => isThisMonth(e.enrolledAt)).length;
  const leadsThisWeek = allEnrollments.filter(e => isThisWeek(e.enrolledAt)).length;
  const leadsLastMonth = allEnrollments.filter(e => isLastMonth(e.enrolledAt)).length;

  // ── Conversion KPIs ──
  const converted = allEnrollments.filter(e => e.enrollmentStatus === "converted");
  const convLifetime = converted.length;
  const convThisMonth = converted.filter(e => isThisMonth(e.enrolledAt)).length;
  const convThisWeek = converted.filter(e => isThisWeek(e.enrolledAt)).length;
  const convLastMonth = converted.filter(e => isLastMonth(e.enrolledAt)).length;

  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100 * 10) / 10 : 0;
  const convPctOverall = pct(convLifetime, leadsLifetime);
  const convPctMonthly = pct(convThisMonth, leadsThisMonth);
  const convPctWeekly = pct(convThisWeek, leadsThisWeek);

  // ── Classes KPIs ──
  const completedSessions = allSessions.filter(s => s.status === "completed");
  const classesLifetime = completedSessions.length;
  const classesThisMonth = completedSessions.filter(s => isThisMonth(s.scheduledAt)).length;
  const classesThisWeek = completedSessions.filter(s => isThisWeek(s.scheduledAt)).length;
  const classesLastMonth = completedSessions.filter(s => isLastMonth(s.scheduledAt)).length;

  // ── Funnel ──
  const demoAttended = allEnrollments.filter(e => (e.lastDayAttended ?? 0) >= 1).length;
  const interested = allEnrollments.filter(e =>
    e.leadStage === "Interested" || e.leadStage === "Very Interested" || e.interestLevel === "High" || e.interestLevel === "Very High"
  ).length;
  const funnel = [
    { stage: "Leads Enrolled", count: leadsLifetime, color: "#3B82F6" },
    { stage: "Demo Attended", count: demoAttended, color: "#8B5CF6" },
    { stage: "Interested", count: interested, color: "#F59E0B" },
    { stage: "Converted", count: convLifetime, color: "#22C55E" },
  ];

  // ── Grade-wise ──
  const gradeMap: Record<number, { leads: number; converted: number }> = {};
  for (const e of allEnrollments) {
    const g = e.grade ?? 0;
    if (!gradeMap[g]) gradeMap[g] = { leads: 0, converted: 0 };
    gradeMap[g].leads += 1;
    if (e.enrollmentStatus === "converted") gradeMap[g].converted += 1;
  }
  const gradeWise = Object.entries(gradeMap)
    .map(([g, v]) => ({ grade: Number(g), leads: v.leads, converted: v.converted, conversionPct: pct(v.converted, v.leads) }))
    .sort((a, b) => a.grade - b.grade);

  // ── Teacher Impact ──
  const teacherMap: Record<string, { classes: number; students: Set<number>; conversions: number }> = {};
  for (const s of allSessions) {
    const b = batchMap[s.batchId];
    const teacher = b?.teacherName ?? "Unknown";
    if (!teacherMap[teacher]) teacherMap[teacher] = { classes: 0, students: new Set(), conversions: 0 };
    teacherMap[teacher].classes += 1;
  }
  for (const e of allEnrollments) {
    const b = batchMap[e.batchId];
    const teacher = b?.teacherName ?? "Unknown";
    if (!teacherMap[teacher]) teacherMap[teacher] = { classes: 0, students: new Set(), conversions: 0 };
    teacherMap[teacher].students.add(e.studentId);
    if (e.enrollmentStatus === "converted") teacherMap[teacher].conversions += 1;
  }
  const teacherImpact = Object.entries(teacherMap)
    .map(([teacher, v]) => ({
      teacher, classes: v.classes, students: v.students.size,
      conversions: v.conversions, conversionPct: pct(v.conversions, v.students.size),
    }))
    .sort((a, b) => b.conversionPct - a.conversionPct);

  // ── Counselor Performance ──
  const counselorMap: Record<string, { leads: number; converted: number }> = {};
  for (const e of allEnrollments) {
    const mentor = e.assignedMentorName ?? "Unassigned";
    if (!counselorMap[mentor]) counselorMap[mentor] = { leads: 0, converted: 0 };
    counselorMap[mentor].leads += 1;
    if (e.enrollmentStatus === "converted") counselorMap[mentor].converted += 1;
  }
  const counselorPerf = Object.entries(counselorMap)
    .map(([counselor, v]) => ({ counselor, leads: v.leads, converted: v.converted, conversionPct: pct(v.converted, v.leads) }))
    .sort((a, b) => b.conversionPct - a.conversionPct);

  // ── Mentor Leaderboard (with per-grade breakdown) ──
  const mentorDetailMap: Record<string, {
    leads: number; converted: number;
    grades: Record<number, { leads: number; converted: number }>;
  }> = {};
  for (const e of allEnrollments) {
    const name = e.assignedMentorName ?? "Unassigned";
    const grade = e.grade ?? 0;
    if (!mentorDetailMap[name]) mentorDetailMap[name] = { leads: 0, converted: 0, grades: {} };
    mentorDetailMap[name].leads += 1;
    if (e.enrollmentStatus === "converted") mentorDetailMap[name].converted += 1;
    if (!mentorDetailMap[name].grades[grade]) mentorDetailMap[name].grades[grade] = { leads: 0, converted: 0 };
    mentorDetailMap[name].grades[grade].leads += 1;
    if (e.enrollmentStatus === "converted") mentorDetailMap[name].grades[grade].converted += 1;
  }
  const mentorLeaderboard = Object.entries(mentorDetailMap)
    .map(([mentor, v]) => ({
      mentor,
      leads: v.leads,
      converted: v.converted,
      conversionPct: pct(v.converted, v.leads),
      grades: Object.entries(v.grades)
        .map(([g, gv]) => ({ grade: Number(g), leads: gv.leads, converted: gv.converted, conversionPct: pct(gv.converted, gv.leads) }))
        .sort((a, b) => b.conversionPct - a.conversionPct),
    }))
    .sort((a, b) => b.conversionPct - a.conversionPct);

  // ── Grade Leaderboard (best mentor per grade) ──
  const gradeLeadMap: Record<number, Record<string, { leads: number; converted: number }>> = {};
  for (const e of allEnrollments) {
    const grade = e.grade ?? 0;
    const name = e.assignedMentorName ?? "Unassigned";
    if (!gradeLeadMap[grade]) gradeLeadMap[grade] = {};
    if (!gradeLeadMap[grade][name]) gradeLeadMap[grade][name] = { leads: 0, converted: 0 };
    gradeLeadMap[grade][name].leads += 1;
    if (e.enrollmentStatus === "converted") gradeLeadMap[grade][name].converted += 1;
  }
  const gradeLeaderboard = Object.entries(gradeLeadMap)
    .filter(([g]) => Number(g) > 0)
    .map(([g, mMap]) => {
      const mentors = Object.entries(mMap)
        .map(([n, v]) => ({ mentor: n, leads: v.leads, converted: v.converted, conversionPct: pct(v.converted, v.leads) }))
        .sort((a, b) => b.conversionPct - a.conversionPct);
      const total = Object.values(mMap).reduce((s, v) => ({ leads: s.leads + v.leads, converted: s.converted + v.converted }), { leads: 0, converted: 0 });
      return {
        grade: Number(g),
        leads: total.leads,
        converted: total.converted,
        conversionPct: pct(total.converted, total.leads),
        topMentor: mentors[0]?.mentor ?? "—",
        topMentorPct: mentors[0]?.conversionPct ?? 0,
        mentors,
      };
    })
    .sort((a, b) => b.conversionPct - a.conversionPct);

  // ── Monthly Trend (last 12 months) ──
  const monthlyTrend: Record<string, { leads: number; conversions: number; classes: number }> = {};
  const monthKey = (d: Date | null) => {
    if (!d) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = monthKey(d)!;
    monthlyTrend[k] = { leads: 0, conversions: 0, classes: 0 };
  }
  for (const e of allEnrollments) {
    const k = monthKey(e.enrolledAt);
    if (k && monthlyTrend[k]) {
      monthlyTrend[k].leads += 1;
      if (e.enrollmentStatus === "converted") monthlyTrend[k].conversions += 1;
    }
  }
  for (const s of completedSessions) {
    const k = monthKey(s.scheduledAt);
    if (k && monthlyTrend[k]) monthlyTrend[k].classes += 1;
  }
  const trend = Object.entries(monthlyTrend).map(([month, v]) => {
    const [y, m] = month.split("-");
    const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    return { month: label, ...v };
  });

  // ── Lead Stage Breakdown ──
  const stageMap: Record<string, number> = {};
  for (const e of allEnrollments) {
    const stage = e.leadStage ?? "Not Set";
    stageMap[stage] = (stageMap[stage] ?? 0) + 1;
  }
  const leadStage = Object.entries(stageMap).map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count);

  // ── Recent Leads ──
  const recentLeads = allEnrollments.slice(0, 50).map(e => ({
    id: e.id,
    studentName: e.studentName,
    grade: e.grade,
    phone: e.studentPhone,
    parentPhone: e.parentPhone,
    enrolledAt: e.enrolledAt,
    enrollmentStatus: e.enrollmentStatus,
    lastDayAttended: e.lastDayAttended,
    assignedMentorName: e.assignedMentorName,
    leadStage: e.leadStage,
    interestLevel: e.interestLevel,
    batchTitle: batchMap[e.batchId]?.title ?? `Batch #${e.batchId}`,
    batchGrade: batchMap[e.batchId]?.grade ?? null,
    teacherName: batchMap[e.batchId]?.teacherName ?? null,
  }));

  res.json({
    kpis: {
      leads: { lifetime: leadsLifetime, thisMonth: leadsThisMonth, thisWeek: leadsThisWeek, lastMonth: leadsLastMonth },
      conversions: { lifetime: convLifetime, thisMonth: convThisMonth, thisWeek: convThisWeek, lastMonth: convLastMonth },
      classes: { lifetime: classesLifetime, thisMonth: classesThisMonth, thisWeek: classesThisWeek, lastMonth: classesLastMonth },
      conversionPct: { overall: convPctOverall, monthly: convPctMonthly, weekly: convPctWeekly },
    },
    funnel,
    gradeWise,
    teacherImpact,
    counselorPerf,
    mentorLeaderboard,
    gradeLeaderboard,
    trend,
    leadStage,
    recentLeads,
  });
});

// ── GET /admin/ignite/paid-students ──────────────────────────
// Returns all Ignite paid students.
// Optional query param: ?status=unassigned|assigned|active|dropped|all (default: all)
router.get("/admin/ignite/paid-students", adminOnly, async (req, res) => {
  const status = (req.query.status as string | undefined) ?? "all";

  const rows = await db
    .select({
      id: ignitePaidStudentsTable.id,
      studentId: ignitePaidStudentsTable.studentId,
      paymentId: ignitePaidStudentsTable.paymentId,
      grade: ignitePaidStudentsTable.grade,
      phone: ignitePaidStudentsTable.phone,
      amountPaise: ignitePaidStudentsTable.amountPaise,
      paidAt: ignitePaidStudentsTable.paidAt,
      assignmentStatus: ignitePaidStudentsTable.assignmentStatus,
      assignedBatchId: ignitePaidStudentsTable.assignedBatchId,
      assignedMentorId: ignitePaidStudentsTable.assignedMentorId,
      assignedMentorName: ignitePaidStudentsTable.assignedMentorName,
      assignedById: ignitePaidStudentsTable.assignedById,
      assignedAt: ignitePaidStudentsTable.assignedAt,
      notes: ignitePaidStudentsTable.notes,
      courseType: ignitePaidStudentsTable.courseType,
      leadSource: ignitePaidStudentsTable.leadSource,
      // batch_assigned
      batchName: ignitePaidStudentsTable.batchName,
      batchStartDate: ignitePaidStudentsTable.batchStartDate,
      teacherName: ignitePaidStudentsTable.teacherName,
      assignedByName: ignitePaidStudentsTable.assignedByName,
      // demo_started / demo_completed
      demoStartDate: ignitePaidStudentsTable.demoStartDate,
      attendancePct: ignitePaidStudentsTable.attendancePct,
      classesAttended: ignitePaidStudentsTable.classesAttended,
      homeworkPct: ignitePaidStudentsTable.homeworkPct,
      // demo_completed
      completionDate: ignitePaidStudentsTable.completionDate,
      conversionRecommendation: ignitePaidStudentsTable.conversionRecommendation,
      // converted
      convertedDate: ignitePaidStudentsTable.convertedDate,
      coursePurchased: ignitePaidStudentsTable.coursePurchased,
      courseValue: ignitePaidStudentsTable.courseValue,
      convertedBy: ignitePaidStudentsTable.convertedBy,
      // dropped
      droppedDate: ignitePaidStudentsTable.droppedDate,
      dropReason: ignitePaidStudentsTable.dropReason,
      createdAt: ignitePaidStudentsTable.createdAt,
      name: usersTable.name,
      school: usersTable.school,
      city: usersTable.city,
      leadStage: usersTable.leadStage,
      callStatus: usersTable.callStatus,
      nextFollowUpAt: usersTable.nextFollowUpAt,
      accountType: usersTable.accountType,
      paymentStatus: paymentsTable.status,
      razorpayPaymentId: paymentsTable.razorpayPaymentId,
    })
    .from(ignitePaidStudentsTable)
    .innerJoin(usersTable, eq(ignitePaidStudentsTable.studentId, usersTable.id))
    .innerJoin(paymentsTable, eq(ignitePaidStudentsTable.paymentId, paymentsTable.id))
    .where(
      status !== "all"
        ? eq(ignitePaidStudentsTable.assignmentStatus, status)
        : undefined,
    )
    .orderBy(desc(ignitePaidStudentsTable.paidAt));

  res.json(rows);
});

// ── GET /admin/ignite/paid-students/unassigned ────────────────
// Shorthand — equivalent to ?status=unassigned
router.get("/admin/ignite/paid-students/unassigned", adminOnly, async (_req, res) => {
  const rows = await db
    .select({
      id: ignitePaidStudentsTable.id,
      studentId: ignitePaidStudentsTable.studentId,
      paymentId: ignitePaidStudentsTable.paymentId,
      grade: ignitePaidStudentsTable.grade,
      phone: ignitePaidStudentsTable.phone,
      amountPaise: ignitePaidStudentsTable.amountPaise,
      paidAt: ignitePaidStudentsTable.paidAt,
      assignmentStatus: ignitePaidStudentsTable.assignmentStatus,
      notes: ignitePaidStudentsTable.notes,
      courseType: ignitePaidStudentsTable.courseType,
      leadSource: ignitePaidStudentsTable.leadSource,
      createdAt: ignitePaidStudentsTable.createdAt,
      name: usersTable.name,
      school: usersTable.school,
      city: usersTable.city,
      leadStage: usersTable.leadStage,
      callStatus: usersTable.callStatus,
      nextFollowUpAt: usersTable.nextFollowUpAt,
      accountType: usersTable.accountType,
      paymentStatus: paymentsTable.status,
      razorpayPaymentId: paymentsTable.razorpayPaymentId,
    })
    .from(ignitePaidStudentsTable)
    .innerJoin(usersTable, eq(ignitePaidStudentsTable.studentId, usersTable.id))
    .innerJoin(paymentsTable, eq(ignitePaidStudentsTable.paymentId, paymentsTable.id))
    .where(eq(ignitePaidStudentsTable.assignmentStatus, "unassigned"))
    .orderBy(desc(ignitePaidStudentsTable.paidAt));

  res.json(rows);
});

// ── GET /admin/ignite/paid-students/assignable-mentors ────────────────────────
// Returns staff members who can be assigned as ICs, with their current load.
router.get("/admin/ignite/paid-students/assignable-mentors", adminOnly, async (_req, res) => {
  const ASSIGNABLE_ROLES = ["mentor", "teacher", "admin", "super_admin"];

  // All staff members eligible to be ICs
  const staff = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(inArray(usersTable.role, ASSIGNABLE_ROLES))
    .orderBy(usersTable.name);

  if (staff.length === 0) {
    res.json([]);
    return;
  }

  // Count active students (not converted / dropped) per mentor
  const INACTIVE_STATUSES = ["converted", "dropped"];
  const loadRows = await db
    .select({
      mentorId: ignitePaidStudentsTable.assignedMentorId,
      activeCount: count(ignitePaidStudentsTable.id),
    })
    .from(ignitePaidStudentsTable)
    .where(
      and(
        isNotNull(ignitePaidStudentsTable.assignedMentorId),
        notInArray(ignitePaidStudentsTable.assignmentStatus, INACTIVE_STATUSES),
      ),
    )
    .groupBy(ignitePaidStudentsTable.assignedMentorId);

  const loadMap = new Map(loadRows.map((r) => [r.mentorId!, Number(r.activeCount)]));

  const result = staff.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    activeStudentCount: loadMap.get(s.id) ?? 0,
  }));

  res.json(result);
});

// ── POST /admin/ignite/paid-students/:id/assign ───────────────────────────────
// Assign an IC/mentor to a paid student.
router.post("/admin/ignite/paid-students/:id/assign", adminOnly, async (req, res) => {
  const recordId = Number(req.params.id);
  const { mentorId } = req.body as { mentorId: number };

  if (!recordId || !mentorId) {
    res.status(400).json({ error: "recordId and mentorId are required" });
    return;
  }

  // Validate paid student record exists
  const [record] = await db
    .select()
    .from(ignitePaidStudentsTable)
    .where(eq(ignitePaidStudentsTable.id, recordId))
    .limit(1);

  if (!record) {
    res.status(404).json({ error: "Paid student record not found" });
    return;
  }

  // Prevent duplicate assignment (already assigned to an IC)
  if (record.assignedMentorId !== null && record.assignmentStatus !== "unassigned") {
    res.status(409).json({ error: "Student is already assigned to an IC", currentMentorId: record.assignedMentorId });
    return;
  }

  // Validate mentor exists
  const [mentor] = await db
    .select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, mentorId))
    .limit(1);

  if (!mentor) {
    res.status(404).json({ error: "Mentor not found" });
    return;
  }

  const assignedById = (req as unknown as { user?: { id: number } }).user?.id ?? null;
  const now = new Date();

  await db
    .update(ignitePaidStudentsTable)
    .set({
      assignedMentorId:   mentor.id,
      assignedMentorName: mentor.name,
      assignedById:       assignedById,
      assignedAt:         now,
      assignmentStatus:   "assigned",
      updatedAt:          now,
    })
    .where(eq(ignitePaidStudentsTable.id, recordId));

  req.log.info({ recordId, mentorId, assignedById }, "Ignite paid student assigned");

  res.json({ ok: true, assignedMentorId: mentor.id, assignedMentorName: mentor.name, assignedAt: now });
});

// ── GET /admin/ignite/leads/:id/status-history ────────────────────────────────
router.get("/admin/ignite/leads/:id/status-history", adminOnly, async (req, res) => {
  const leadId = Number(req.params.id);
  const rows = await db.select().from(leadStatusHistoryTable)
    .where(eq(leadStatusHistoryTable.leadId, leadId))
    .orderBy(desc(leadStatusHistoryTable.changedAt))
    .limit(100);
  res.json(rows);
});

// ── GET /admin/ignite/leads/:id/reassignment-history ──────────────────────────
router.get("/admin/ignite/leads/:id/reassignment-history", adminOnly, async (req, res) => {
  const leadId = Number(req.params.id);
  const rows = await db.select().from(mentorReassignmentHistoryTable)
    .where(eq(mentorReassignmentHistoryTable.leadId, leadId))
    .orderBy(desc(mentorReassignmentHistoryTable.reassignedAt))
    .limit(100);
  res.json(rows);
});

// ── PATCH /admin/ignite/leads/:id/mark-lost ───────────────────────────────────
router.patch("/admin/ignite/leads/:id/mark-lost", adminOnly, async (req, res) => {
  const leadId = Number(req.params.id);
  const { reason } = req.body as { reason?: string };
  const actor = (req as any).user ?? { id: null, name: "Admin", role: "admin" };

  const [lead] = await db.select({ id: usersTable.id, name: usersTable.name, leadStage: usersTable.leadStage })
    .from(usersTable).where(eq(usersTable.id, leadId)).limit(1);
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

  const now = new Date();
  const oldStatus = lead.leadStage;

  await db.update(usersTable).set({
    leadStage: "Lost",
    lostReason: reason ?? null,
    lostAt: now,
    lostBy: actor.id,
    updatedAt: now,
  }).where(eq(usersTable.id, leadId));

  await db.insert(leadStatusHistoryTable).values({
    leadId,
    oldStatus,
    newStatus: "Lost",
    changedById: actor.id,
    changedByName: actor.name ?? "Admin",
    changedByRole: actor.role ?? "admin",
    remarks: reason ?? null,
  });

  await db.insert(studentTimelineTable).values({
    studentId: leadId,
    createdById: actor.id,
    createdByName: actor.name ?? "Admin",
    createdByRole: actor.role ?? "admin",
    noteType: "status_change",
    remark: `Lead marked as Lost${reason ? `: ${reason}` : ""}`,
    actionTaken: "mark_lost",
  });

  await logLeadAudit(req, "mark_lost", leadId, lead.name, { oldStatus, reason });
  res.json({ ok: true });
});

// ── PATCH /admin/ignite/leads/:id/reopen ──────────────────────────────────────
router.patch("/admin/ignite/leads/:id/reopen", adminOnly, async (req, res) => {
  const leadId = Number(req.params.id);
  const { remarks } = req.body as { remarks?: string };
  const actor = (req as any).user ?? { id: null, name: "Admin", role: "admin" };

  const [lead] = await db.select({ id: usersTable.id, name: usersTable.name, leadStage: usersTable.leadStage })
    .from(usersTable).where(eq(usersTable.id, leadId)).limit(1);
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

  const now = new Date();
  await db.update(usersTable).set({
    leadStage: "contacted",
    lostReason: null,
    lostAt: null,
    lostBy: null,
    updatedAt: now,
  }).where(eq(usersTable.id, leadId));

  await db.insert(leadStatusHistoryTable).values({
    leadId,
    oldStatus: "Lost",
    newStatus: "contacted",
    changedById: actor.id,
    changedByName: actor.name ?? "Admin",
    changedByRole: actor.role ?? "admin",
    remarks: remarks ?? "Lead reopened by admin",
  });

  await db.insert(studentTimelineTable).values({
    studentId: leadId,
    createdById: actor.id,
    createdByName: actor.name ?? "Admin",
    createdByRole: actor.role ?? "admin",
    noteType: "status_change",
    remark: `Lead reopened${remarks ? `: ${remarks}` : ""}`,
    actionTaken: "reopen",
  });

  await logLeadAudit(req, "reopen_lead", leadId, lead.name, { remarks });
  res.json({ ok: true });
});

// ── POST /admin/ignite/leads/:id/reassign ─────────────────────────────────────
router.post("/admin/ignite/leads/:id/reassign", adminOnly, async (req, res) => {
  const leadId = Number(req.params.id);
  const { newMentorId, reason } = req.body as { newMentorId: number; reason?: string };
  const actor = (req as any).user ?? { id: null, name: "Admin", role: "admin" };

  if (!newMentorId) { res.status(400).json({ error: "newMentorId is required" }); return; }

  const [lead] = await db.select({ id: usersTable.id, name: usersTable.name, assignedMentorId: usersTable.assignedMentorId, assignedAt: usersTable.assignedAt })
    .from(usersTable).where(eq(usersTable.id, leadId)).limit(1);
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

  const [newMentor] = await db.select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable).where(eq(usersTable.id, newMentorId)).limit(1);
  if (!newMentor) { res.status(404).json({ error: "Mentor not found" }); return; }

  let prevMentorName: string | null = null;
  if (lead.assignedMentorId) {
    const [pm] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, lead.assignedMentorId)).limit(1);
    prevMentorName = pm?.name ?? null;
  }

  const now = new Date();

  await db.update(usersTable).set({
    assignedMentorId: newMentor.id,
    assignedAt: now,
    assignedById: actor.id,
    updatedAt: now,
  }).where(eq(usersTable.id, leadId));

  if (lead.assignedMentorId) {
    await db.update(mentorStudentAssignmentsTable)
      .set({ isActive: false })
      .where(and(eq(mentorStudentAssignmentsTable.studentId, leadId), eq(mentorStudentAssignmentsTable.isActive, true)));
  }
  await db.insert(mentorStudentAssignmentsTable).values({
    mentorId: newMentor.id,
    studentId: leadId,
    isActive: true,
  });

  await db.insert(mentorReassignmentHistoryTable).values({
    leadId,
    previousMentorId: lead.assignedMentorId ?? null,
    previousMentorName: prevMentorName,
    newMentorId: newMentor.id,
    newMentorName: newMentor.name,
    reassignedById: actor.id,
    reassignedByName: actor.name ?? "Admin",
    reason: reason ?? null,
  });

  await db.insert(studentTimelineTable).values({
    studentId: leadId,
    createdById: actor.id,
    createdByName: actor.name ?? "Admin",
    createdByRole: actor.role ?? "admin",
    noteType: "reassignment",
    remark: `Reassigned from ${prevMentorName ?? "Unassigned"} to ${newMentor.name}${reason ? ` — Reason: ${reason}` : ""}`,
    actionTaken: "reassign",
  });

  await logLeadAudit(req, "reassign_lead", leadId, lead.name, {
    previousMentorId: lead.assignedMentorId,
    previousMentorName: prevMentorName,
    newMentorId: newMentor.id,
    newMentorName: newMentor.name,
    reason,
  });

  res.json({ ok: true, newMentorId: newMentor.id, newMentorName: newMentor.name });
});

// ── PATCH /admin/ignite/leads/:id/disable ─────────────────────────────────────
router.patch("/admin/ignite/leads/:id/disable", adminOnly, async (req, res) => {
  const leadId = Number(req.params.id);
  const { reason } = req.body as { reason?: string };
  const actor = (req as any).user ?? { id: null, name: "Admin", role: "admin" };

  const [lead] = await db.select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable).where(eq(usersTable.id, leadId)).limit(1);
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

  await db.update(usersTable).set({
    isActive: false,
    disabledAt: new Date(),
    disabledBy: actor.id,
    disabledReason: reason ?? null,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, leadId));

  await db.insert(studentTimelineTable).values({
    studentId: leadId, createdById: actor.id,
    createdByName: actor.name ?? "Admin", createdByRole: actor.role ?? "admin",
    noteType: "status_change",
    remark: `Lead disabled${reason ? `: ${reason}` : ""}`,
    actionTaken: "disable",
  });
  await logLeadAudit(req, "disable_lead", leadId, lead.name, { reason });
  res.json({ ok: true });
});

// ── PATCH /admin/ignite/leads/:id/restore ─────────────────────────────────────
router.patch("/admin/ignite/leads/:id/restore", adminOnly, async (req, res) => {
  const leadId = Number(req.params.id);
  const actor = (req as any).user ?? { id: null, name: "Admin", role: "admin" };

  const [lead] = await db.select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable).where(eq(usersTable.id, leadId)).limit(1);
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

  await db.update(usersTable).set({
    isActive: true, disabledAt: null, disabledBy: null, disabledReason: null,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, leadId));

  await db.insert(studentTimelineTable).values({
    studentId: leadId, createdById: actor.id,
    createdByName: actor.name ?? "Admin", createdByRole: actor.role ?? "admin",
    noteType: "status_change", remark: "Lead restored by admin", actionTaken: "restore",
  });
  await logLeadAudit(req, "restore_lead", leadId, lead.name, {});
  res.json({ ok: true });
});

// ── POST /admin/ignite/deploy ─────────────────────────────────────────────────
// Distributes all unassigned pending leads (optionally filtered by grade) across active sales mentors.
router.post("/admin/ignite/deploy", adminOnly, async (req, res) => {
  const { grade, mentorIds: requestedMentorIds } = req.body as { grade?: number | null; mentorIds?: number[] };
  const actor = (req as any).user ?? { id: null, name: "Admin", role: "admin" };

  const pendingLeads = await db.select({ id: usersTable.id, grade: usersTable.grade, leadStage: usersTable.leadStage })
    .from(usersTable)
    .where(and(
      inArray(usersTable.accountType, ["lead", "demo_student"]),
      eq(usersTable.isDeleted, false),
      eq(usersTable.isActive, true),
      isNull(usersTable.assignedMentorId),
      or(isNull(usersTable.leadStage), notInArray(usersTable.leadStage, ["Lost", "Converted"])),
      ...(grade ? [eq(usersTable.grade, Number(grade))] : []),
    ));

  const safePending = pendingLeads;

  if (safePending.length === 0) {
    res.json({ ok: false, message: "No pending unassigned leads to deploy", deployed: 0 });
    return;
  }

  const mentorsQuery = db.select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(and(
      eq(usersTable.role, "mentor"),
      eq(usersTable.mentorType, "sales"),
      eq(usersTable.isActive, true),
      eq(usersTable.isDeleted, false),
      ...(requestedMentorIds?.length ? [inArray(usersTable.id, requestedMentorIds)] : []),
    ));
  const mentors = await mentorsQuery;

  if (mentors.length === 0) {
    res.json({ ok: false, message: "No active sales mentors available", deployed: 0 });
    return;
  }

  const n = safePending.length;
  const m = mentors.length;
  const base = Math.floor(n / m);
  const rem = n % m;

  const groups: { mentor: typeof mentors[0]; leads: typeof safePending }[] = [];
  let cursor = 0;
  mentors.forEach((mentor, i) => {
    const size = base + (i < rem ? 1 : 0);
    if (size > 0) {
      groups.push({ mentor, leads: safePending.slice(cursor, cursor + size) });
      cursor += size;
    }
  });

  const now = new Date();

  // Attach assignments to the current active deployment cycle (if any)
  const [activeCycle] = await db
    .select({ id: mentorDeploymentCyclesTable.id })
    .from(mentorDeploymentCyclesTable)
    .where(eq(mentorDeploymentCyclesTable.status, "active"))
    .orderBy(desc(mentorDeploymentCyclesTable.createdAt))
    .limit(1);

  for (const g of groups) {
    const ids = g.leads.map(l => l.id);
    await db.update(usersTable).set({
      assignedMentorId: g.mentor.id,
      assignedAt: now,
      assignmentStatus: "assigned",
      deploymentStatus: "Assigned",
      updatedAt: now,
    }).where(inArray(usersTable.id, ids));

    const existing = await db.select({ studentId: mentorStudentAssignmentsTable.studentId })
      .from(mentorStudentAssignmentsTable)
      .where(and(
        eq(mentorStudentAssignmentsTable.mentorId, g.mentor.id),
        inArray(mentorStudentAssignmentsTable.studentId, ids),
      ));
    const existingIds = new Set(existing.map(e => e.studentId));
    const newIds = ids.filter(id => !existingIds.has(id));
    if (newIds.length > 0) {
      await db.insert(mentorStudentAssignmentsTable).values(
        newIds.map(sid => ({ mentorId: g.mentor.id, studentId: sid, assignedAt: now, isActive: true, deploymentCycleId: activeCycle?.id ?? null }))
      );
    }
  }

  // Generate batch code BTL-G{grade}-{year}-{seq}
  const batchYear = new Date().getFullYear();
  const gradeStr = grade ? `G${grade}` : "GALL";
  const [{ seqCount }] = await db.select({ seqCount: count() }).from(leadDeploymentsTable);
  const seq = Number(seqCount) + 1;
  const batchCode = `BTL-${gradeStr}-${batchYear}-${String(seq).padStart(3, "0")}`;

  const [deployment] = await db.insert(leadDeploymentsTable).values({
    batchCode,
    grade: grade ? Number(grade) : null,
    createdById: actor.id,
    createdByName: actor.name ?? "Admin",
    totalLeads: n,
    mentorCount: groups.length,
    distributionMethod: "equal",
    selectedMentorIds: requestedMentorIds?.length ? JSON.stringify(requestedMentorIds) : null,
    status: "completed",
  }).returning();

  if (groups.length > 0) {
    await db.insert(leadDeploymentGroupsTable).values(
      groups.map(g => ({
        deploymentId: deployment.id,
        mentorId: g.mentor.id,
        mentorName: g.mentor.name,
        leadCount: g.leads.length,
      }))
    );
  }

  // ── Sprint 1: Unify mentor_groups — create one group per mentor in this deployment ──
  // Fire-and-forget: non-critical bridge; does not affect existing deploy flow
  Promise.all(
    groups.map(async (g) => {
      try {
        const [mg] = await db.insert(mentorGroupsTable).values({
          batchId: null,
          sessionId: null,
          mentorId: g.mentor.id,
          mentorName: g.mentor.name ?? "Mentor",
          groupName: `${batchCode} · ${g.mentor.name ?? `Mentor ${g.mentor.id}`}`,
          programType: "ignite",
        }).returning({ id: mentorGroupsTable.id });

        if (mg && g.leads.length > 0) {
          await db.insert(groupStudentsTable).values(
            g.leads.map(lead => ({
              mentorGroupId: mg.id,
              studentId: String(lead.id),
              studentName: `Lead-${lead.id}`,
              phone: null,
            }))
          ).onConflictDoNothing();
        }

        // Back-link the deployment group row
        if (mg) {
          await db.update(leadDeploymentGroupsTable)
            .set({ mentorGroupId: mg.id })
            .where(
              and(
                eq(leadDeploymentGroupsTable.deploymentId, deployment.id),
                eq(leadDeploymentGroupsTable.mentorId, g.mentor.id),
              )
            );
        }
      } catch { /* non-critical */ }
    })
  ).catch(() => {});

  // Create timeline entries for every assigned lead
  const timelineRows = groups.flatMap(g => g.leads.map(lead => ({
    studentId: lead.id,
    createdById: actor.id ?? null,
    createdByName: actor.name ?? "Admin",
    createdByRole: actor.role ?? "admin",
    noteType: "deployment",
    remark: `Lead assigned.\n\nMentor: ${g.mentor.name}\nDeployment Batch: ${batchCode}\nAssigned By: ${actor.name ?? "Admin"}`,
  })));
  if (timelineRows.length > 0) {
    // insert in chunks of 100 to avoid query size limits
    for (let i = 0; i < timelineRows.length; i += 100) {
      await db.insert(studentTimelineTable).values(timelineRows.slice(i, i + 100)).catch(() => {});
    }
  }

  // Update deploymentBatchId on deployed leads
  const allDeployedIds = groups.flatMap(g => g.leads.map(l => l.id));
  if (allDeployedIds.length > 0) {
    for (let i = 0; i < allDeployedIds.length; i += 500) {
      await db.update(usersTable).set({ deploymentBatchId: deployment.id }).where(inArray(usersTable.id, allDeployedIds.slice(i, i + 500)));
    }
  }

  await logLeadAudit(req, "deploy_leads", 0, "batch", { grade, totalLeads: n, mentors: groups.length, batchCode });
  res.json({
    ok: true,
    deployed: n,
    mentorsUsed: groups.length,
    deploymentId: deployment.id,
    batchCode,
    groups: groups.map(g => ({ mentorId: g.mentor.id, mentorName: g.mentor.name, count: g.leads.length })),
  });
});

// ── GET /admin/ignite/deployments ─────────────────────────────────────────────
router.get("/admin/ignite/deployments", adminOnly, async (_req, res) => {
  const deps = await db.select().from(leadDeploymentsTable).orderBy(desc(leadDeploymentsTable.createdAt)).limit(50);
  const depIds = deps.map(d => d.id);
  const groups = depIds.length > 0
    ? await db.select().from(leadDeploymentGroupsTable).where(inArray(leadDeploymentGroupsTable.deploymentId, depIds))
    : [];
  const groupsByDep: Record<number, typeof groups> = {};
  groups.forEach(g => { (groupsByDep[g.deploymentId] ??= []).push(g); });
  res.json(deps.map(d => ({ ...d, groups: groupsByDep[d.id] ?? [] })));
});

// ── POST /admin/ignite/redistribute ──────────────────────────────────────────
router.post("/admin/ignite/redistribute", adminOnly, async (req, res) => {
  const { sourceMentorId, leadIds, targetMentorIds } = req.body as {
    sourceMentorId?: number; leadIds?: number[]; targetMentorIds: number[];
  };
  const actor = (req as any).user ?? { id: null, name: "Admin", role: "admin" };

  if (!targetMentorIds?.length) { res.status(400).json({ error: "targetMentorIds required" }); return; }

  let toRedistribute: { id: number }[] = [];
  if (leadIds?.length) {
    toRedistribute = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(inArray(usersTable.id, leadIds), eq(usersTable.isDeleted, false)));
  } else if (sourceMentorId) {
    toRedistribute = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(
        eq(usersTable.assignedMentorId, sourceMentorId),
        eq(usersTable.isDeleted, false), eq(usersTable.isActive, true),
      ));
  }

  if (!toRedistribute.length) { res.json({ ok: false, message: "No leads to redistribute", moved: 0 }); return; }

  const mentors = await db.select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable).where(inArray(usersTable.id, targetMentorIds));
  if (!mentors.length) { res.status(400).json({ error: "No valid target mentors" }); return; }

  const n = toRedistribute.length;
  const m = mentors.length;
  const base = Math.floor(n / m);
  const rem = n % m;
  const now = new Date();
  let cursor = 0;

  for (let i = 0; i < mentors.length; i++) {
    const size = base + (i < rem ? 1 : 0);
    if (size === 0) continue;
    const batch = toRedistribute.slice(cursor, cursor + size);
    cursor += size;
    const ids = batch.map(l => l.id);
    await db.update(usersTable).set({
      assignedMentorId: mentors[i].id, assignedAt: now, assignmentStatus: "assigned", updatedAt: now,
    }).where(inArray(usersTable.id, ids));

    await db.insert(mentorReassignmentHistoryTable).values(ids.map(lid => ({
      leadId: lid, newMentorId: mentors[i].id, newMentorName: mentors[i].name,
      prevMentorId: sourceMentorId ?? null, prevMentorName: null,
      reassignedById: actor.id, reassignedByName: actor.name ?? "Admin",
      reason: "Redistribution",
    }))).catch(() => {});
  }

  await logLeadAudit(req, "redistribute_leads", 0, "batch", {
    sourceMentorId, targetMentorIds, movedCount: n,
  });
  res.json({ ok: true, moved: n, mentorsUsed: mentors.length });
});

// ── GET /admin/ignite/deploy/stats ────────────────────────────────────────────
router.get("/admin/ignite/deploy/stats", adminOnly, async (req, res) => {
  const grade = req.query.grade ? Number(req.query.grade) : null;

  const baseWhere = and(
    inArray(usersTable.accountType, ["lead", "demo_student"]),
    eq(usersTable.isDeleted, false),
    eq(usersTable.isActive, true),
    ...(grade ? [eq(usersTable.grade, grade)] : []),
  );

  const [undeployedRes, assignedRes, convertedRes, lostRes] = await Promise.all([
    db.select({ c: count() }).from(usersTable).where(and(baseWhere, isNull(usersTable.assignedMentorId), or(isNull(usersTable.leadStage), notInArray(usersTable.leadStage, ["Lost", "Converted"])))),
    db.select({ c: count() }).from(usersTable).where(and(baseWhere, isNotNull(usersTable.assignedMentorId))),
    db.select({ c: count() }).from(usersTable).where(and(baseWhere, eq(usersTable.leadStage, "Converted"))),
    db.select({ c: count() }).from(usersTable).where(and(baseWhere, eq(usersTable.leadStage, "Lost"))),
  ]);

  const [activeMentorsRes] = await db.select({ c: count() }).from(usersTable).where(and(
    eq(usersTable.role, "mentor"),
    eq(usersTable.mentorType, "sales"),
    eq(usersTable.isActive, true),
    eq(usersTable.isDeleted, false),
    eq(usersTable.isArchived, false),
  ));

  res.json({
    undeployedLeads: Number(undeployedRes[0]?.c ?? 0),
    activeMentors:   Number(activeMentorsRes?.c ?? 0),
    assignedLeads:   Number(assignedRes[0]?.c ?? 0),
    convertedLeads:  Number(convertedRes[0]?.c ?? 0),
    lostLeads:       Number(lostRes[0]?.c ?? 0),
  });
});

// ── GET /admin/ignite/deploy/mentors ───────────────────────────────────────────
router.get("/admin/ignite/deploy/mentors", adminOnly, async (_req, res) => {
  const mentors = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
    isActive: usersTable.isActive, department: usersTable.department,
    disabledAt: usersTable.disabledAt,
  }).from(usersTable).where(and(
    eq(usersTable.role, "mentor"),
    eq(usersTable.mentorType, "sales"),
    eq(usersTable.isDeleted, false),
    eq(usersTable.isArchived, false),
  ));

  if (!mentors.length) { res.json([]); return; }

  const mentorIds = mentors.map(m => m.id);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [currentLeadsRes, followUpsRes, convRes] = await Promise.all([
    db.select({ mentorId: usersTable.assignedMentorId, c: count() })
      .from(usersTable)
      .where(and(
        inArray(usersTable.assignedMentorId, mentorIds),
        or(isNull(usersTable.leadStage), notInArray(usersTable.leadStage, ["Lost", "Converted"])),
        eq(usersTable.isDeleted, false),
      ))
      .groupBy(usersTable.assignedMentorId),
    db.select({ mentorId: usersTable.assignedMentorId, c: count() })
      .from(usersTable)
      .where(and(
        inArray(usersTable.assignedMentorId, mentorIds),
        eq(usersTable.nextFollowUpAt, today.toISOString().slice(0, 10)),
      ))
      .groupBy(usersTable.assignedMentorId),
    db.select({ mentorId: demoBatchEnrollmentsTable.assignedMentorId, total: count(), converted: sql<number>`SUM(CASE WHEN ${demoBatchEnrollmentsTable.enrollmentStatus}='converted' THEN 1 ELSE 0 END)` })
      .from(demoBatchEnrollmentsTable)
      .where(inArray(demoBatchEnrollmentsTable.assignedMentorId, mentorIds))
      .groupBy(demoBatchEnrollmentsTable.assignedMentorId),
  ]);

  const currentLeadsMap = Object.fromEntries(currentLeadsRes.map(r => [r.mentorId!, Number(r.c)]));
  const followUpsMap    = Object.fromEntries(followUpsRes.map(r => [r.mentorId!, Number(r.c)]));
  const convMap         = Object.fromEntries(convRes.map(r => [r.mentorId!, { total: Number(r.total), converted: Number(r.converted) }]));

  res.json(mentors.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    isActive: m.isActive && !m.disabledAt,
    status: m.isActive && !m.disabledAt ? "Active" : (m.disabledAt ? "On Leave" : "Inactive"),
    currentLeads:      currentLeadsMap[m.id] ?? 0,
    todaysFollowUps:   followUpsMap[m.id] ?? 0,
    conversionRate:    convMap[m.id] ? Math.round((convMap[m.id].converted / convMap[m.id].total) * 100) : 0,
  })));
});

// ── Admin: manually top-up the batch pipeline for a grade ────────────────────
// POST /admin/ignite/ensure-pipeline/:grade
// Safe to call at any time — idempotent. Returns how many batches now exist.
// ── GET /admin/ignite/batch-pipeline/:grade — batch rows + health for one grade ─
router.get("/admin/ignite/batch-pipeline/:grade", adminOnly, async (req, res) => {
  const grade = parseInt(String(req.params.grade), 10);
  if (!grade || grade < 1 || grade > 10) {
    res.status(400).json({ error: "grade must be 1–10" });
    return;
  }

  const datedWhere = and(
    eq(demoBatchesTable.grade, grade),
    isNotNull(demoBatchesTable.startDate),
    isNotNull(demoBatchesTable.endDate),
  );

  const activeBatches = await db
    .select()
    .from(demoBatchesTable)
    .where(and(datedWhere, eq(demoBatchesTable.status, "active")))
    .orderBy(demoBatchesTable.startDate);

  const upcomingBatches = await db
    .select()
    .from(demoBatchesTable)
    .where(and(datedWhere, eq(demoBatchesTable.status, "upcoming")))
    .orderBy(demoBatchesTable.startDate)
    .limit(3);

  const [{ undatedCount }] = await db
    .select({ undatedCount: sql<number>`count(*)::int` })
    .from(demoBatchesTable)
    .where(
      and(
        eq(demoBatchesTable.grade, grade),
        sql`(${demoBatchesTable.startDate} IS NULL OR ${demoBatchesTable.endDate} IS NULL)`,
      ),
    );

  const ac = activeBatches.length;
  const uc = upcomingBatches.length;
  const issues: string[] = [];
  if (ac !== PIPELINE_ACTIVE_TARGET)   issues.push(`active=${ac} (need ${PIPELINE_ACTIVE_TARGET})`);
  if (uc !== PIPELINE_UPCOMING_TARGET) issues.push(`upcoming=${uc} (need ${PIPELINE_UPCOMING_TARGET})`);

  res.json({
    grade,
    activeCount:    ac,
    upcomingCount:  uc,
    healthy:        issues.length === 0,
    issues,
    activeBatch:    activeBatches[0] ?? null,
    upcomingBatches,
    undatedCount:   undatedCount ?? 0,
  });
});

// ── GET /admin/ignite/batch-health — read-only health for all grades ─────────
router.get("/admin/ignite/batch-health", adminOnly, async (_req, res) => {
  const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = await Promise.all(
    grades.map(async (grade) => {
      const [{ activeCount }] = await db
        .select({ activeCount: sql<number>`count(*)::int` })
        .from(demoBatchesTable)
        .where(
          and(
            eq(demoBatchesTable.grade, grade),
            eq(demoBatchesTable.status, "active"),
            isNotNull(demoBatchesTable.startDate),
            isNotNull(demoBatchesTable.endDate),
          ),
        );
      const [{ upcomingCount }] = await db
        .select({ upcomingCount: sql<number>`count(*)::int` })
        .from(demoBatchesTable)
        .where(
          and(
            eq(demoBatchesTable.grade, grade),
            eq(demoBatchesTable.status, "upcoming"),
            isNotNull(demoBatchesTable.startDate),
            isNotNull(demoBatchesTable.endDate),
          ),
        );
      const ac = activeCount ?? 0;
      const uc = upcomingCount ?? 0;
      const issues: string[] = [];
      if (ac !== PIPELINE_ACTIVE_TARGET)   issues.push(`active=${ac} (need ${PIPELINE_ACTIVE_TARGET})`);
      if (uc !== PIPELINE_UPCOMING_TARGET) issues.push(`upcoming=${uc} (need ${PIPELINE_UPCOMING_TARGET})`);
      return { grade, activeCount: ac, upcomingCount: uc, healthy: issues.length === 0, issues };
    }),
  );
  res.json(results);
});

// ── POST /admin/ignite/ensure-pipeline/:grade — repair + return state ─────────
router.post("/admin/ignite/ensure-pipeline/:grade", requireRole("admin", "super_admin"), async (req, res) => {
  const grade = parseInt(String(req.params.grade), 10);
  if (!grade || grade < 1 || grade > 10) {
    res.status(400).json({ error: "grade must be 1–10" });
    return;
  }

  try {
    await ensureThreeWeekPipeline(grade);
    const health = await checkBatchPipelineHealth(grade);

    const batches = await db
      .select({
        id:        demoBatchesTable.id,
        title:     demoBatchesTable.title,
        status:    demoBatchesTable.status,
        startDate: demoBatchesTable.startDate,
        endDate:   demoBatchesTable.endDate,
        batchCode: demoBatchesTable.batchCode,
      })
      .from(demoBatchesTable)
      .where(eq(demoBatchesTable.grade, grade))
      .orderBy(demoBatchesTable.startDate);

    res.json({
      grade,
      total:         batches.length,
      activeCount:   health.activeCount,
      upcomingCount: health.upcomingCount,
      healthy:       health.healthy,
      issues:        health.issues,
      activeTarget:  PIPELINE_ACTIVE_TARGET,
      upcomingTarget: PIPELINE_UPCOMING_TARGET,
      batches,
    });
  } catch (err) {
    res.status(500).json({ error: "Pipeline repair failed", detail: String(err) });
  }
});

export default router;
