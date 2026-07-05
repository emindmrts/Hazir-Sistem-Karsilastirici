/**
 * getProducts.mjs — filtered, sorted, paginated product endpoint.
 *
 * The filter/sort/paginate logic lives in lib/filterProducts.mjs so this
 * Express route stays a thin layer on top of it.
 */

import { Router } from "express";
import { promises as fs } from "fs";
import { watch } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { filterProducts } from "../lib/filterProducts.mjs";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOCK_PATH = path.join(__dirname, "..", "mock.json");

// ─── In-memory cache ─────────────────────────────────────────────────────────
let cache = null;

async function loadCache() {
  const raw = await fs.readFile(MOCK_PATH, "utf-8");
  cache = JSON.parse(raw);
  console.log(`[cache] Loaded ${cache.length} products from mock.json`);
  return cache;
}

async function getProducts() {
  if (!cache) await loadCache();
  return cache;
}

// Invalidate cache when mock.json is written
watch(MOCK_PATH, (eventType) => {
  if (eventType === "change") {
    console.log("[cache] mock.json changed — invalidating cache");
    cache = null;
  }
});

// ─── Route ───────────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const data = await getProducts();
    res.json(filterProducts(data, req.body));
  } catch (err) {
    console.error("[getProducts] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;