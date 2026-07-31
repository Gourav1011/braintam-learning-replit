import { db } from "@workspace/db";
import {
  usersTable,
  mentorStudentAssignmentsTable,
  mentorFollowUpsTable,
  mentorDeploymentCyclesTable,
  demoBatchEnrollmentsTable,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export async function runIgniteWeeklyRollover(
  createdById: number | null = null,
  createdByName = "System",
) {
  const [cycle] = await db
    .select()
    .from(mentorDeploymentCyclesTable)
    .where(eq(mentorDeploymentCyclesTable.status, "active"))
    .orderBy(desc(mentorDeploymentCyclesTable.createdAt))
    .limit(1);

  if (!cycle) {
    return { ok: false, message: "No active Ignite deployment cycle" };
  }

  const assignments = await db
    .select({ studentId: mentorStudentAssignmentsTable.studentId })
    .from(mentorStudentAssignmentsTable)
    .where(and(
      eq(mentorStudentAssignmentsTable.deploymentCycleId, cycle.id),
      eq(mentorStudentAssignmentsTable.isActive, true),
    ));

  const studentIds = [...new Set(assignments.map(a => a.studentId))];

  if (studentIds.length > 0) {
    // Repeated is permanent: once a student has attended/enrolled in
    // 2+ Ignite batches, never remove the flag in future cycles.
    const repeatedRows = await db
      .select({
        studentId: demoBatchEnrollmentsTable.studentId,
        enrollmentCount: sql<number>`count(*)`,
      })
      .from(demoBatchEnrollmentsTable)
      .where(inArray(demoBatchEnrollmentsTable.studentId, studentIds))
      .groupBy(demoBatchEnrollmentsTable.studentId)
      .having(sql`count(*) >= 2`);

    const repeatedIds = repeatedRows.map(r => r.studentId);

    if (repeatedIds.length > 0) {
      await db.update(usersTable)
        .set({
          repeatedCustomer: true,
          updatedAt: new Date(),
        })
        .where(inArray(usersTable.id, repeatedIds));
    }

    const contacted = await db
      .select({ studentId: mentorFollowUpsTable.studentId })
      .from(mentorFollowUpsTable)
      .where(and(
        eq(mentorFollowUpsTable.deploymentCycleId, cycle.id),
        eq(mentorFollowUpsTable.noteType, "Call Outcome"),
        inArray(mentorFollowUpsTable.studentId, studentIds),
      ));

    const contactedIds = new Set(contacted.map(r => r.studentId));

    const students = await db
      .select({
        id: usersTable.id,
        leadStage: usersTable.leadStage,
      })
      .from(usersTable)
      .where(inArray(usersTable.id, studentIds));

    const oldLeadIds: number[] = [];
    const lostIds: number[] = [];

    for (const student of students) {
      if (student.leadStage === "Converted") continue;

      if (contactedIds.has(student.id)) {
        oldLeadIds.push(student.id);
      } else {
        lostIds.push(student.id);
      }
    }

    if (oldLeadIds.length > 0) {
      await db.update(usersTable)
        .set({
          leadStage: "Old Lead",
          assignmentStatus: "unassigned",
          deploymentStatus: "Undeployed",
          assignedMentorId: null,
          callStatus: "Pending",
          updatedAt: new Date(),
        })
        .where(inArray(usersTable.id, oldLeadIds));
    }

    if (lostIds.length > 0) {
      await db.update(usersTable)
        .set({
          leadStage: "Lost",
          lostReason: "Not contacted during Ignite deployment week",
          lostAt: new Date(),
          assignmentStatus: "unassigned",
          deploymentStatus: "Undeployed",
          assignedMentorId: null,
          callStatus: "Pending",
          updatedAt: new Date(),
        })
        .where(inArray(usersTable.id, lostIds));
    }

    await db.update(mentorStudentAssignmentsTable)
      .set({ isActive: false })
      .where(and(
        eq(mentorStudentAssignmentsTable.deploymentCycleId, cycle.id),
        eq(mentorStudentAssignmentsTable.isActive, true),
      ));
  }

  await db.update(mentorDeploymentCyclesTable)
    .set({
      status: "archived",
      archivedAt: new Date(),
    })
    .where(eq(mentorDeploymentCyclesTable.id, cycle.id));

  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );

  const yyyy = nowIST.getFullYear();
  const mm = String(nowIST.getMonth() + 1).padStart(2, "0");
  const dd = String(nowIST.getDate()).padStart(2, "0");
  const startDate = `${yyyy}-${mm}-${dd}`;

  const month = nowIST.toLocaleDateString("en-IN", { month: "short" });
  const weekNum = Math.ceil(nowIST.getDate() / 7);

  const [newCycle] = await db
    .insert(mentorDeploymentCyclesTable)
    .values({
      weekLabel: `${month} W${weekNum} – ${startDate}`,
      startDate,
      status: "active",
      createdById,
      createdByName,
    })
    .returning();

  return {
    ok: true,
    archivedCycleId: cycle.id,
    newCycle,
    processed: studentIds.length,
  };
}

export function scheduleIgniteWeeklyRollover(): void {
  const CHECK_INTERVAL_MS = 60 * 1000;
  let lastRunKey = "";

  const tick = async () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());

    const get = (type: string) =>
      parts.find(p => p.type === type)?.value ?? "";

    if (
      get("weekday") !== "Sun" ||
      get("hour") !== "23" ||
      get("minute") !== "00"
    ) return;

    const runKey = `${get("year")}-${get("month")}-${get("day")}`;

    if (lastRunKey === runKey) return;
    lastRunKey = runKey;

    try {
      await runIgniteWeeklyRollover(null, "System Weekly Rollover");
      console.log("[Ignite] Sunday 11 PM IST weekly rollover completed");
    } catch (error) {
      lastRunKey = "";
      console.error("[Ignite] weekly rollover failed", error);
    }
  };

  setInterval(() => void tick(), CHECK_INTERVAL_MS);
  console.log("[Ignite] weekly rollover scheduled for Sunday 11:00 PM IST");
}
