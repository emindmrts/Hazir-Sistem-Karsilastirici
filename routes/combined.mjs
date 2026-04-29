/**
 * combined.mjs — runs all scrapers in parallel and writes mock.json.
 *
 * Key improvements:
 *  - No more HTTP self-calls (direct function imports)
 *  - All scrapers run concurrently via Promise.allSettled
 *  - Failures are logged but don't block the write
 *  - Previous mock.json is preserved on total failure
 */

import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { scrapeAllPages as scrapePckolik } from "./pckolik.mjs";
import { scrapeAllPages as scrapeVatan } from "./vatan.mjs";
import { scrapeAllPages as scrapeTebilon } from "./tebilon.mjs";
import { scrapeAllPages as scrapeSinerji } from "./sinerji.mjs";
import { scrapeAllPages as scrapeItopya } from "./itopya.mjs";
import { scrapeAllPages as scrapeInceHesap } from "./inceHesap.mjs";
import { scrapeAllPages as scrapeGameGaraj } from "./gameGaraj.mjs";
import { scrapeAllPages as scrapeGamingGen } from "./gamingGen.mjs";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOCK_PATH = path.join(__dirname, "..", "mock.json");
const META_PATH = path.join(__dirname, "..", "cache-meta.json");

const SCRAPERS = [
  { name: "pckolik", fn: scrapePckolik },
  { name: "vatan", fn: scrapeVatan },
  { name: "tebilon", fn: scrapeTebilon },
  { name: "sinerji", fn: scrapeSinerji },
  { name: "itopya", fn: scrapeItopya },
  { name: "inceHesap", fn: scrapeInceHesap },
  { name: "gameGaraj", fn: scrapeGameGaraj },
  { name: "gamingGen", fn: scrapeGamingGen },
];

export async function runCombined() {
  console.log("[combined] Starting parallel scraping…");
  const start = Date.now();

  const settled = [];
  for (let i = 0; i < SCRAPERS.length; i += 2) {
    const batch = SCRAPERS.slice(i, i + 2);
    const batchResults = await Promise.allSettled(
      batch.map(({ name, fn }) =>
        fn().then((data) => {
          console.log(`[combined] ✅ ${name}: ${data.length} products`);
          return data;
        }).catch((err) => {
          console.error(`[combined] ❌ ${name}: ${err.message}`);
          return [];
        })
      )
    );
    settled.push(...batchResults);
  }

  const combined = settled.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  if (combined.length === 0) {
    console.warn("[combined] No products scraped — keeping existing mock.json");
    return null;
  }

  await fs.writeFile(MOCK_PATH, JSON.stringify(combined));
  await fs.writeFile(META_PATH, JSON.stringify({
    lastUpdated: new Date().toISOString(),
    totalProducts: combined.length,
    durationMs: Date.now() - start,
  }));

  console.log(`[combined] ✅ Done — ${combined.length} products in ${Date.now() - start}ms`);
  return combined;
}

router.get("/", async (req, res) => {
  try {
    const products = await runCombined();
    if (products === null) {
      // Return existing mock
      const existing = JSON.parse(await fs.readFile(MOCK_PATH, "utf-8"));
      return res.json(existing);
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
