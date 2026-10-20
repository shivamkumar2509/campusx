const cron = require("node-cron");
const Event = require("../models/event.model");

const runDeadlineCheck = async () => {
  try {
    const now = new Date();
    const expiredEvents = await Event.find({
      status: "published",
      deadline: { $lt: now },
    })
      .select("_id title")
      .lean();

    if (expiredEvents.length === 0) return;

    const {
      runMatchingInternal,
    } = require("../controllers/matching.controller");

    for (const ev of expiredEvents) {
      try {
        await Event.updateOne({ _id: ev._id }, { $set: { status: "closed" } });
        console.log(`[cron] closed event: ${ev.title} (${ev._id})`);

        await runMatchingInternal(ev._id);
        console.log(`[cron] matched event: ${ev.title}`);
      } catch (err) {
        console.error(`[cron] failed for event ${ev._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[cron] deadline check error:", err.message);
  }
};

const startEventDeadlineJob = () => {
  // Every 15 minutes
  cron.schedule("*/15 * * * *", runDeadlineCheck);
  console.log("⏰ Event deadline cron started (every 15 min)");
};

module.exports = { startEventDeadlineJob, runDeadlineCheck };
