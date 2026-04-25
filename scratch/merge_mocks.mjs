import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRATCH_MOCK = path.join(__dirname, "mock.json");
const ROOT_MOCK = path.join(__dirname, "..", "mock.json");

async function merge() {
    try {
        const scratchData = JSON.parse(await fs.readFile(SCRATCH_MOCK, "utf-8"));
        const rootData = JSON.parse(await fs.readFile(ROOT_MOCK, "utf-8"));
        
        console.log(`Merging ${scratchData.length} Itopya products into root mock.json (${rootData.length} products).`);
        
        const others = rootData.filter(p => p.store !== "itopya");
        const merged = [...others, ...scratchData];
        
        await fs.writeFile(ROOT_MOCK, JSON.stringify(merged));
        console.log(`Successfully merged. New total: ${merged.length}`);
        
        // Update cache-meta
        const META_PATH = path.join(__dirname, "..", "cache-meta.json");
        await fs.writeFile(META_PATH, JSON.stringify({
            lastUpdated: new Date().toISOString(),
            totalProducts: merged.length,
            durationMs: 0
        }));
        
    } catch (e) {
        console.error("Merge failed:", e);
    }
}

merge();
