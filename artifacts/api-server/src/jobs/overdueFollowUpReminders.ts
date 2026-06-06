import { db } from "@workspace/db";
import { mentorFollowUpsTable, mentorReminderPrefsTable, usersTable } from "@workspace/db";
import { eq, and, lt, ne, isNotNull, inArray } from "drizzle-orm";
import { sendSms } from "../services/sms.js";
import { logger } from "../lib/logger.js";

function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function currentHHMMist(): string {
  return new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
}

interface OverdueEntry {
  studentName: string | null;
  nextFollowUpDate: string;
  daysOverdue: number;
  note: string;
}

function buildDigestMessage(mentorName: string, items: OverdueEntry[]): string {
  const lines = items.slice(0, 10).map((f, i) => {
    const label = f.daysOverdue === 0 ? "today" : `${f.daysOverdue}d overdue`;
    return `${i + 1}. ${f.studentName ?? "Student"} (${label})`;
  });
  const extra = items.length > 10 ? `\n...and ${items.length - 10} more.` : "";
  return (
    `Hi ${mentorName}, you have ${items.length} overdue follow-up(s) on Braintam CRM:\n` +
    lines.join("\n") +
    extra +
    "\nPlease log in to take action."
  );
}

function buildSingleMessage(mentorName: string, f: OverdueEntry): string {
  const label = f.daysOverdue === 0 ? "is due today" : `is ${f.daysOverdue} day(s) overdue`;
  return (
    `Hi ${mentorName}, your follow-up with ${f.studentName ?? "a student"} ${label} on Braintam CRM. ` +
    `Please log in and take action.`
  );
}

async function markReminderSent(mentorId: number, date: string): Promise<void> {
  await db
    .update(mentorReminderPrefsTable)
    .set({ lastReminderSentDate: date })
    .where(eq(mentorReminderPrefsTable.mentorId, mentorId));
}

export async function runOverdueFollowUpReminders(): Promise<void> {
  const today = todayIST();
  const nowHHMM = currentHHMMist();
  logger.info({ today, nowHHMM }, "Running overdue follow-up reminder job");

  const prefs = await db
    .select({
      mentorId: mentorReminderPrefsTable.mentorId,
      remindersEnabled: mentorReminderPrefsTable.remindersEnabled,
      digestMode: mentorReminderPrefsTable.digestMode,
      digestTime: mentorReminderPrefsTable.digestTime,
      lastReminderSentDate: mentorReminderPrefsTable.lastReminderSentDate,
      mentorName: usersTable.name,
      mentorPhone: usersTable.phone,
    })
    .from(mentorReminderPrefsTable)
    .innerJoin(usersTable, eq(usersTable.id, mentorReminderPrefsTable.mentorId))
    .where(eq(mentorReminderPrefsTable.remindersEnabled, true));

  if (prefs.length === 0) {
    logger.info("No mentors with reminders enabled — skipping");
    return;
  }

  // Only process mentors who haven't been notified today yet.
  const eligiblePrefs = prefs.filter(p => p.lastReminderSentDate !== today);
  if (eligiblePrefs.length === 0) {
    logger.info({ today }, "All mentors already notified today — skipping");
    return;
  }

  // For digest mode, further filter to mentors whose preferred time window is now.
  // For instant mode (non-digest), we send once per day at the first eligible run.
  const toNotify = eligiblePrefs.filter(p => {
    if (!p.digestMode) return true; // instant: send on any run, guarded by lastReminderSentDate
    const [prefHH, prefMM] = p.digestTime.split(":").map(Number);
    const [nowHH, nowMM] = nowHHMM.split(":").map(Number);
    const prefMinutes = prefHH * 60 + prefMM;
    const nowMinutes = nowHH * 60 + nowMM;
    const inWindow = nowMinutes >= prefMinutes && nowMinutes < prefMinutes + 60;
    if (!inWindow) {
      logger.info(
        { mentorId: p.mentorId, digestTime: p.digestTime, nowHHMM },
        "Skipping digest — not yet in preferred 60-min send window",
      );
    }
    return inWindow;
  });

  if (toNotify.length === 0) {
    logger.info("No mentors in active send window right now — skipping");
    return;
  }

  const mentorIds = toNotify.map(p => p.mentorId);

  const overdueRows = await db
    .select({
      mentorId: mentorFollowUpsTable.mentorId,
      studentName: usersTable.name,
      nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate,
      note: mentorFollowUpsTable.note,
    })
    .from(mentorFollowUpsTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.studentId))
    .where(
      and(
        inArray(mentorFollowUpsTable.mentorId, mentorIds),
        isNotNull(mentorFollowUpsTable.nextFollowUpDate),
        lt(mentorFollowUpsTable.nextFollowUpDate, today),
        ne(mentorFollowUpsTable.callStatus, "completed"),
      ),
    );

  const byMentor = new Map<number, OverdueEntry[]>();
  for (const row of overdueRows) {
    const daysOverdue = Math.floor(
      (new Date(today).getTime() - new Date(row.nextFollowUpDate!).getTime()) / 86400000,
    );
    const entry: OverdueEntry = {
      studentName: row.studentName,
      nextFollowUpDate: row.nextFollowUpDate!,
      daysOverdue,
      note: row.note,
    };
    const existing = byMentor.get(row.mentorId) ?? [];
    existing.push(entry);
    byMentor.set(row.mentorId, existing);
  }

  let notified = 0;
  for (const pref of toNotify) {
    const items = byMentor.get(pref.mentorId);
    if (!pref.mentorPhone) {
      logger.warn({ mentorId: pref.mentorId }, "Mentor has no phone number — skipping reminder");
      // Still mark sent so we don't retry endlessly today
      await markReminderSent(pref.mentorId, today);
      continue;
    }
    if (!items || items.length === 0) {
      // No overdue items — mark as "checked today" so we don't query again
      await markReminderSent(pref.mentorId, today);
      continue;
    }

    let anySent = false;
    if (pref.digestMode) {
      const message = buildDigestMessage(pref.mentorName, items);
      const result = await sendSms(pref.mentorPhone, message);
      anySent = result.ok;
    } else {
      for (const item of items) {
        const message = buildSingleMessage(pref.mentorName, item);
        const result = await sendSms(pref.mentorPhone, message);
        if (result.ok) anySent = true;
      }
    }

    // Mark sent whether or not SMS succeeded — prevents retry spam on API failures
    await markReminderSent(pref.mentorId, today);
    if (anySent) notified++;
  }

  logger.info({ mentorsNotified: notified, mentorsChecked: toNotify.length }, "Overdue follow-up reminder job complete");
}
