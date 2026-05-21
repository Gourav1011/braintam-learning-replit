/**
 * App-level reminder orchestrator.
 * Called right after login is confirmed AND on every app foreground.
 * Schedules 15-min class reminders and 24h homework reminders for ALL
 * eligible items — regardless of which tabs the student visits.
 * Respects per-item opt-outs persisted by the tab-screen toggles.
 */
import { listLiveClasses, listHomework } from "@workspace/api-client-react";
import {
  isClassNotificationScheduled,
  isHomeworkNotificationScheduled,
  scheduleClassNotification,
  scheduleHomeworkNotification,
  cancelClassNotification,
  getNotificationPermissionStatus,
} from "@/services/notifications";
import {
  isClassOptedOut,
  isHomeworkOptedOut,
} from "@/services/notifOptOut";

function minutesUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 60000;
}

function hoursUntilDue(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}

export async function scheduleAllReminders(): Promise<void> {
  const permission = await getNotificationPermissionStatus();
  if (permission !== "granted") return;

  const [classes, homework] = await Promise.allSettled([
    listLiveClasses(),
    listHomework(),
  ]);

  // Schedule 15-min reminders for upcoming classes (skip opt-outs)
  if (classes.status === "fulfilled") {
    await Promise.allSettled(
      classes.value
        .filter((c) => {
          const mins = minutesUntil(c.scheduledAt);
          return c.status === "upcoming" && mins > 15;
        })
        .map(async (c) => {
          const [already, optedOut] = await Promise.all([
            isClassNotificationScheduled(c.id),
            isClassOptedOut(c.id),
          ]);
          if (!already && !optedOut) {
            await scheduleClassNotification(c.id, c.title, new Date(c.scheduledAt));
          }
        })
    );

    // Cancel notifications for classes that have ended or gone live
    await Promise.allSettled(
      classes.value
        .filter((c) => c.status === "ended" || c.status === "live")
        .map((c) => cancelClassNotification(c.id))
    );
  }

  // Schedule 24h reminders for pending homework (skip opt-outs)
  if (homework.status === "fulfilled") {
    await Promise.allSettled(
      homework.value
        .filter((h) => hoursUntilDue(h.dueDate) > 24)
        .map(async (h) => {
          const [already, optedOut] = await Promise.all([
            isHomeworkNotificationScheduled(h.id),
            isHomeworkOptedOut(h.id),
          ]);
          if (!already && !optedOut) {
            await scheduleHomeworkNotification(h.id, h.title, new Date(h.dueDate));
          }
        })
    );
  }
}
