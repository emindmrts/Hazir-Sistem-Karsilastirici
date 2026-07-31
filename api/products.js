/**
 * api/products.js — Vercel Serverless Function
 *
 * Mirrors the Express route in routes/getProducts.mjs but exposed as a
 * Vercel-compatible handler. Filter/sort/paginate logic is shared via
 * lib/filterProducts.mjs.
 *
 * POST /api/products  →  filtered, sorted, paginated product list
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { filterProducts } from "../lib/filterProducts.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOCK_PATH = path.join(__dirname, "..", "mock.json");

// Simple in-memory cache (lives for the lifetime of this serverless instance)
let _cache = null;

async function getProducts() {
  if (!_cache) {
    const raw = await fs.readFile(MOCK_PATH, "utf-8");
    _cache = JSON.parse(raw);
  }
  return _cache;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const data = await getProducts();
    res.json(filterProducts(data, req.body));
  } catch (err) {
    console.error("[api/products] Error:", err);
    res.status(500).json({ error: err.message });
  }
}