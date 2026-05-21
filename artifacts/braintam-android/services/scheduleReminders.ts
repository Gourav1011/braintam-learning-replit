/**
 * App-level reminder orchestrator.
 * Called after login is confirmed — schedules 15-min class reminders and
 * 24h homework reminders for ALL eligible upcoming items, regardless of
 * which tabs the student visits.
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

function minutesUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 60000;
}

function hoursUntilDue(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}

export async function scheduleAllReminders(): Promise<void> {
  const permission = await getNotificationPermissionStatus();
  if (permission !== "granted") return;

  // Run class + homework fetches in parallel
  const [classes, homework] = await Promise.allSettled([
    listLiveClasses(),
    listHomework(),
  ]);

  // Schedule 15-min reminders for upcoming classes
  if (classes.status === "fulfilled") {
    await Promise.allSettled(
      classes.value
        .filter((c) => {
          const mins = minutesUntil(c.scheduledAt);
          return c.status === "upcoming" && mins > 15;
        })
        .map(async (c) => {
          const already = await isClassNotificationScheduled(c.id);
          if (!already) {
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

  // Schedule 24h reminders for pending homework
  if (homework.status === "fulfilled") {
    await Promise.allSettled(
      homework.value
        .filter((h) => hoursUntilDue(h.dueDate) > 24)
        .map(async (h) => {
          const already = await isHomeworkNotificationScheduled(h.id);
          if (!already) {
            await scheduleHomeworkNotification(h.id, h.title, new Date(h.dueDate));
          }
        })
    );
  }
}
