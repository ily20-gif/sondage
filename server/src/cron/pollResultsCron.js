import cron from "node-cron";
import { closeExpiredPolls } from "../lib/pollClosure.js";
import {
  sendPollResults,
  sendPollClosingWarning,
} from "../controllers/notifications.controller.js";

let isRunning = false;

cron.schedule("* * * * *", async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const closedCount = await closeExpiredPolls();
    if (closedCount) console.log(`Closed ${closedCount} expired poll(s)`);

    await sendPollResults();
    await sendPollClosingWarning();
  } catch (error) {
    console.error("Cron execution error:", error);
  } finally {
    isRunning = false;
  }
});
