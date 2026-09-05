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
    // USE_ENUCUZSISTEM_API env'ine saygi: true (varsayilan) -> hizli API modu,
    // false -> bireysel magaza scraper'lari (per-store fallback ihtiyacinda)
    const pythonDir = path.join(__dirname, "..", "python_backend");
    const useApi = process.env.USE_ENUCUZSISTEM_API !== "false";
    const execOpts = {
        cwd: pythonDir,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, USE_ENUCUZSISTEM_API: String(useApi) },
    };

    cron.schedule("0 3 * * *", () => {
        console.log("[scheduler] Nightly scrape triggered at", new Date().toISOString());
        
        exec("python run_scrapers.py", execOpts, (error, stdout, stderr) => {
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
