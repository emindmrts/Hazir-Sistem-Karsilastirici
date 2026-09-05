/**
 * Nightly auto-refresh scheduler.
 * Uses node-cron to run all scrapers at 03:00 every day.
 */

import cron from "node-cron";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startScheduler() {
    // Runs at 03:00 every day (server timezone)
    cron.schedule("0 3 * * *", () => {
        console.log("[scheduler] Nightly scrape triggered at", new Date().toISOString());
        
        const pythonDir = path.join(__dirname, "..", "python_backend");
        // maxBuffer raised: Rich UI + per-page scraper logs can exceed exec's default buffer.
        exec("python run_scrapers.py", { cwd: pythonDir, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                console.error("[scheduler] Nightly scrape failed:", error.message);
                return;
            }
            if (stderr) {
                console.error("[scheduler] Nightly scrape stderr:", stderr);
            }
            console.log("[scheduler] Nightly scrape finished:\n", stdout);
        });
    });

    console.log("[scheduler] Scheduled — nightly scrape at 03:00");
}
