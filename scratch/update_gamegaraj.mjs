import { scrapeAllPages as scrapeGameGaraj } from "../routes/gameGaraj.mjs";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOCK_PATH = path.join(__dirname, "..", "mock.json");

async function updateGameGaraj() {
    console.log("Starting GameGaraj update...");
    try {
        const gameGarajProducts = await scrapeGameGaraj();
        console.log(`Scraped ${gameGarajProducts.length} products from GameGaraj.`);
        
        let existing = [];
        try {
            const data = await fs.readFile(MOCK_PATH, "utf-8");
            existing = JSON.parse(data);
        } catch (e) {
            console.warn("Could not read mock.json, starting fresh.");
        }
        
        // Remove old GameGaraj products
        const otherProducts = existing.filter(p => p.store !== "gameGaraj");
        
        // Merge
        const merged = [...otherProducts, ...gameGarajProducts];
        
        await fs.writeFile(MOCK_PATH, JSON.stringify(merged));
        console.log(`Updated mock.json with ${gameGarajProducts.length} GameGaraj products. Total: ${merged.length}`);
        
        // Update cache-meta.json
        const META_PATH = path.join(__dirname, "..", "cache-meta.json");
        await fs.writeFile(META_PATH, JSON.stringify({
            lastUpdated: new Date().toISOString(),
            totalProducts: merged.length,
            durationMs: 0
        }));
        
    } catch (error) {
        console.error("Update failed:", error);
    }
}

updateGameGaraj();
