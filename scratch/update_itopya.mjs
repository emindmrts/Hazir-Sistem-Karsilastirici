import { scrapeAllPages as scrapeItopya } from "../routes/itopya.mjs";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOCK_PATH = path.join(__dirname, "mock.json");

async function updateItopya() {
    console.log("Starting Itopya update...");
    try {
        const itopyaProducts = await scrapeItopya();
        console.log(`Scraped ${itopyaProducts.length} products from Itopya.`);
        
        let existing = [];
        try {
            const data = await fs.readFile(MOCK_PATH, "utf-8");
            existing = JSON.parse(data);
        } catch (e) {
            console.warn("Could not read mock.json, starting fresh.");
        }
        
        // Remove old itopya products
        const otherProducts = existing.filter(p => p.store !== "itopya");
        
        // Merge
        const merged = [...otherProducts, ...itopyaProducts];
        
        await fs.writeFile(MOCK_PATH, JSON.stringify(merged));
        console.log(`Updated mock.json with ${itopyaProducts.length} Itopya products. Total: ${merged.length}`);
        
        // Update cache-meta.json as well if needed
        const META_PATH = path.join(__dirname, "cache-meta.json");
        await fs.writeFile(META_PATH, JSON.stringify({
            lastUpdated: new Date().toISOString(),
            totalProducts: merged.length,
            durationMs: 0 // dummy
        }));
        
    } catch (error) {
        console.error("Update failed:", error);
    }
}

updateItopya();
