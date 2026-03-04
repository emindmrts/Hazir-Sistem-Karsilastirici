/**
 * Nightly auto-refresh scheduler.
 * Uses node-cron to run all scrapers at 03:00 every day.
 */

import cron from "node-cron";
import { runCombined } from "../routes/combined.mjs";

export function startScheduler() {
    // Runs at 03:00 every day (server timezone)
    cron.schedule("0 3 * * *", async () => {
        console.log("[scheduler] Nightly scrape triggered at", new Date().toISOString());
        try {
            await runCombined();
        } catch (err) {
            console.error("[scheduler] Nightly scrape failed:", err.message);
        }
    });

    console.log("[scheduler] Scheduled — nightly scrape at 03:00");
}
