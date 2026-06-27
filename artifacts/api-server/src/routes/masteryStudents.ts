import { Router } from "express";
import { db } from "@workspace/db";
import {
  masteryStudentsTable,
  masteryTimelineTable,
  ignitePaidStudentsTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");
const allStaff = requireRole("admin", "super_admin", "teacher", "mentor");

// ── Helpers ────────────────────────────────────────────────────────────────

async function addTimeline(
  masteryStudentId: number,
  eventType: string,
  eventLabel: string,
  eventData?: Record<string, unknown> | null,
  actorId?: number | null,
  actorName?: string | null,
) {
  await db.insert(masteryTimelineTable).values({
    masteryStudentId,
    eventType,
    eventLabel,
    eventData: eventData ? JSON.stringify(eventData) : null,
    actorId: actorId ?? null,
    actorName: actorName ?? null,
  });
}

// ── POST /admin/ignite/move-to-mastery ─────────────────────────────────────
// Called from ignite CRM when a lead is moved to Mastery.
// Accepts igniteLeadId (ignitePaidStudents.id) + optional overrides.
router.post("/admin/ignite/move-to-mastery", adminOnly, async (req, res) => {
  const actor = req.authUser!;
  const {
    igniteLeadId,
    studentId: userIdInput,
    coursePlan,
    courseValue,
    courseDuration,
    mentorId,
    mentorName,
    academicYear,
  } = req.body as {
    igniteLeadId?: number;
    studentId?: number;
    coursePlan?: string;
    courseValue?: number;
    courseDuration?: string;
    mentorId?: number;
    mentorName?: string;
    academicYear?: string;
  };

  if (!igniteLeadId && !userIdInput) {
    res.status(400).json({ error: "igniteLeadId or studentId required" });
    return;
  }

  // Load ignite lead
  let igniteLead: typeof ignitePaidStudentsTable.$inferSelect | undefined;
  if (igniteLeadId) {
    [igniteLead] = await db
      .select()
      .from(ignitePaidStudentsTable)
      .where(eq(ignitePaidStudentsTable.id, igniteLeadId))
      .limit(1);
  } else if (userIdInput) {
    [igniteLead] = await db
      .select()
      .from(ignitePaidStudentsTable)
      .where(eq(ignitePaidStudentsTable.studentId, userIdInput))
      .orderBy(desc(ignitePaidStudentsTable.createdAt))
      .limit(1);
  }

  // Load user record
  const userId = igniteLead?.studentId ?? userIdInput;
  let user: typeof usersTable.$inferSelect | undefined;
  if (userId) {
    [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
  }

  if (!user) {
    res.status(404).json({ error: "Student user not found" });
    return;
  }

  // Check if mastery student already exists for this ignite lead / student
  const existing = await db
    .select({ id: masteryStudentsTable.id })
    .from(masteryStudentsTable)
    .where(
      igniteLead
        ? eq(masteryStudentsTable.igniteLeadId, igniteLead.id)
        : eq(masteryStudentsTable.studentId, user.id),
    )
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Mastery student already exists", masteryStudentId: existing[0].id });
    return;
  }

  const amountPaid = igniteLead?.courseValue ?? courseValue ?? 0;
  const resolvedMentorId = mentorId ?? igniteLead?.assignedMentorId ?? null;
  const resolvedMentorName = mentorName ?? igniteLead?.assignedMentorName ?? null;
  const resolvedAcademicYear = academicYear ?? `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`;

  const [ms] = await db
    .insert(masteryStudentsTable)
    .values({
      igniteLeadId: igniteLead?.id ?? null,
      studentId: user.id,
      studentName: user.name,
      parentName: user.parentName ?? null,
      phone: user.phone ?? igniteLead?.phone ?? "",
      alternatePhone: user.altPhone ?? null,
      email: user.email ?? null,
      grade: user.grade ?? igniteLead?.grade ?? 0,
      board: user.board ?? null,
      coursePlan: coursePlan ?? igniteLead?.coursePurchased ?? null,
      courseDuration: courseDuration ?? null,
      amountPaid,
      amountPending: 0,
      paymentStatus: amountPaid > 0 ? "paid" : "pending",
      mentorId: resolvedMentorId,
      mentorName: resolvedMentorName,
      academicYear: resolvedAcademicYear,
      admissionDate: new Date(),
      source: "Ignite Conversion",
      masteryStatus: "Active",
      isNewAdmission: true,
    })
    .returning();

  // Timeline: student created
  await addTimeline(ms.id, "student_created", "Mastery Student Created", { source: "Ignite Conversion" }, actor.id, actor.name);
  // Timeline: converted from ignite
  if (igniteLead) {
    await addTimeline(ms.id, "converted_from_ignite", "Converted from Ignite CRM", { igniteLeadId: igniteLead.id }, actor.id, actor.name);
  }
  // Timeline: mentor assigned
  if (resolvedMentorId) {
    await addTimeline(ms.id, "mentor_assigned", `Mentor Assigned: ${resolvedMentorName ?? "Unknown"}`, { mentorId: resolvedMentorId }, actor.id, actor.name);
  }
  // Timeline: payment
  if (amountPaid > 0) {
    await addTimeline(ms.id, "payment_approved", `Payment Approved: ₹${amountPaid.toLocaleString("en-IN")}`, { amountPaid }, actor.id, actor.name);
  }

  // Mark ignite lead as converted if not already
  if (igniteLead && igniteLead.assignmentStatus !== "converted") {
    await db
      .update(ignitePaidStudentsTable)
      .set({ assignmentStatus: "converted", convertedDate: new Date(), convertedBy: actor.name, updatedAt: new Date() })
      .where(eq(ignitePaidStudentsTable.id, igniteLead.id));
  }

  res.json({ ok: true, masteryStudent: ms });
});

// ── GET /admin/mastery/students ────────────────────────────────────────────
router.get("/admin/mastery/students", allStaff, async (req, res) => {
  const status    = String(req.query.status ?? "");
  const grade     = String(req.query.grade ?? "");
  const mentorIdQ = String(req.query.mentorId ?? "");
  const q         = String(req.query.q ?? "");

  const rows = await db
    .select()
    .from(masteryStudentsTable)
    .orderBy(desc(masteryStudentsTable.admissionDate));

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Compute derived status
  const enriched = rows.map((r) => {
    let computedStatus: string;
    if (r.renewedAt) {
      computedStatus = "renewed";
    } else if (r.renewalDueDate && r.renewalDueDate <= now) {
      computedStatus = "retention_due";
    } else if (r.admissionDate >= thirtyDaysAgo) {
      computedStatus = "new_admission";
    } else {
      computedStatus = "existing";
    }
    return { ...r, computedStatus };
  });

  // Filters
  let filtered = enriched;
  if (status) filtered = filtered.filter((r) => r.computedStatus === status || r.masteryStatus === status);
  if (grade)     filtered = filtered.filter((r) => r.grade === Number(grade));
  if (mentorIdQ) filtered = filtered.filter((r) => r.mentorId === Number(mentorIdQ));
  if (q) {
    const lq = q.toLowerCase();
    filtered = filtered.filter(
      (r) => r.studentName.toLowerCase().includes(lq) || r.phone.includes(lq),
    );
  }

  // Stats
  const total = enriched.length;
  const newAdmissions = enriched.filter((r) => r.computedStatus === "new_admission").length;
  const existing = enriched.filter((r) => r.computedStatus === "existing").length;
  const active = enriched.filter((r) => r.masteryStatus === "Active").length;
  const retentionDue = enriched.filter((r) => r.computedStatus === "retention_due").length;
  const renewed = enriched.filter((r) => r.computedStatus === "renewed").length;

  res.json({
    stats: { total, newAdmissions, existing, active, retentionDue, renewed },
    students: filtered,
  });
});

// ── GET /admin/mastery/students/:id ────────────────────────────────────────
router.get("/admin/mastery/students/:id", allStaff, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [student] = await db
    .select()
    .from(masteryStudentsTable)
    .where(eq(masteryStudentsTable.id, id))
    .limit(1);

  if (!student) { res.status(404).json({ error: "Not found" }); return; }

  const timeline = await db
    .select()
    .from(masteryTimelineTable)
    .where(eq(masteryTimelineTable.masteryStudentId, id))
    .orderBy(desc(masteryTimelineTable.createdAt));

  // Ignite history if linked
  let igniteHistory: { date: string; status: string; notes: string | null }[] = [];
  if (student.igniteLeadId) {
    const igniteRaw = await db
      .select({
        assignmentStatus: ignitePaidStudentsTable.assignmentStatus,
        convertedDate: ignitePaidStudentsTable.convertedDate,
        completionDate: ignitePaidStudentsTable.completionDate,
        demoStartDate: ignitePaidStudentsTable.demoStartDate,
        paidAt: ignitePaidStudentsTable.paidAt,
        notes: ignitePaidStudentsTable.notes,
      })
      .from(ignitePaidStudentsTable)
      .where(eq(ignitePaidStudentsTable.id, student.igniteLeadId))
      .limit(1);

    if (igniteRaw.length > 0) {
      const il = igniteRaw[0];
      igniteHistory = [
        il.paidAt ? { date: il.paidAt.toISOString(), status: "Demo Enrolled", notes: null } : null,
        il.demoStartDate ? { date: il.demoStartDate.toISOString(), status: "Demo Started", notes: null } : null,
        il.completionDate ? { date: il.completionDate.toISOString(), status: "Demo Completed", notes: null } : null,
        il.convertedDate ? { date: il.convertedDate.toISOString(), status: "Converted to Mastery", notes: il.notes } : null,
      ].filter(Boolean) as { date: string; status: string; notes: string | null }[];
    }
  }

  res.json({ student, timeline, igniteHistory });
});

// ── PATCH /admin/mastery/students/:id ──────────────────────────────────────
router.patch("/admin/mastery/students/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const actor = req.authUser!;

  const allowed = [
    "studentName", "parentName", "phone", "alternatePhone", "email",
    "grade", "board", "coursePlan", "courseDuration", "amountPaid",
    "amountPending", "paymentStatus", "mentorId", "mentorName",
    "academicYear", "masteryStatus", "renewalDueDate", "renewedAt",
    "promotedGrade", "notes",
  ] as const;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key] === "" ? null : req.body[key];
  }

  const [updated] = await db
    .update(masteryStudentsTable)
    .set(updates as Partial<typeof masteryStudentsTable.$inferInsert>)
    .where(eq(masteryStudentsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  // Timeline: mentor change
  if ("mentorId" in req.body) {
    await addTimeline(id, "mentor_assigned", `Mentor Updated: ${req.body.mentorName ?? "Unknown"}`, { mentorId: req.body.mentorId }, actor.id, actor.name);
  }
  // Timeline: payment update
  if ("paymentStatus" in req.body) {
    await addTimeline(id, "payment_approved", `Payment Status: ${req.body.paymentStatus}`, { paymentStatus: req.body.paymentStatus, amountPaid: req.body.amountPaid }, actor.id, actor.name);
  }
  // Timeline: renewal
  if ("renewedAt" in req.body && req.body.renewedAt) {
    await addTimeline(id, "renewed", "Student Renewed", { renewedAt: req.body.renewedAt }, actor.id, actor.name);
  }
  // Timeline: retention started
  if ("renewalDueDate" in req.body && req.body.renewalDueDate) {
    await addTimeline(id, "retention_started", `Retention Due Set: ${req.body.renewalDueDate}`, { renewalDueDate: req.body.renewalDueDate }, actor.id, actor.name);
  }
  // Timeline: grade promotion
  if ("promotedGrade" in req.body && req.body.promotedGrade) {
    await addTimeline(id, "promoted", `Promoted to Grade ${req.body.promotedGrade}`, { promotedGrade: req.body.promotedGrade }, actor.id, actor.name);
  }

  res.json({ ok: true, student: updated });
});

// ── POST /admin/mastery/students/:id/timeline ──────────────────────────────
router.post("/admin/mastery/students/:id/timeline", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const actor = req.authUser!;
  const { eventType, eventLabel, eventData } = req.body as { eventType: string; eventLabel: string; eventData?: Record<string, unknown> };
  if (!eventType || !eventLabel) { res.status(400).json({ error: "eventType and eventLabel required" }); return; }

  await addTimeline(id, eventType, eventLabel, eventData ?? null, actor.id, actor.name);
  res.json({ ok: true });
});

export default router;
