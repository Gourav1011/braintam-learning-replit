import app from "./app";
import { logger } from "./lib/logger";
import { runOverdueFollowUpReminders } from "./jobs/overdueFollowUpReminders.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  scheduleReminderJob();
});

function scheduleReminderJob(): void {
  const CHECK_INTERVAL_MS = 30 * 60 * 1000;

  const runWithGuard = async () => {
    try {
      await runOverdueFollowUpReminders();
    } catch (err) {
      logger.error({ err }, "Overdue follow-up reminder job failed");
    }
  };

  setInterval(runWithGuard, CHECK_INTERVAL_MS);
  logger.info({ intervalMinutes: 30 }, "Overdue follow-up reminder job scheduled (runs every 30 min)");
}
