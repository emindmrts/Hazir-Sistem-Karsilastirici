/**
 * api/products.js — Vercel Serverless Function
 *
 * Mirrors the Express route in routes/getProducts.mjs
 * but exposed as a Vercel-compatible handler.
 *
 * POST /api/products  →  filtered, sorted, paginated product list
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  // Only allow POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const {
    searchTerm,
    startPrice,
    endPrice,
    selectedGPUs,
    selectedCPUs,
    stores,
    page = 1,
    pageSize = 60,
    orderBy,
    isStocked,
  } = req.body;

  try {
    let data = await getProducts();

    // Normalise: ensure every item has a `url` and `price` as number
    data = data.map((item) => ({
      ...item,
      url: item.url ?? item.link ?? "",
      price:
        typeof item.price === "number"
          ? item.price
          : parseFloat(String(item.price ?? 0)) || 0,
    }));

    // ── Filters ────────────────────────────────────────────────────────────────
    if (startPrice != null && startPrice > 0)
      data = data.filter((i) => i.price >= startPrice);

    if (endPrice != null && endPrice > 0)
      data = data.filter((i) => i.price <= endPrice);

    if (searchTerm)
      data = data.filter((i) =>
        i.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (selectedGPUs?.length)
      data = data.filter((i) =>
        selectedGPUs.some((g) =>
          i.specs?.GPU?.toLowerCase().includes(g.toLowerCase())
        )
      );

    if (selectedCPUs?.length) {
      const hasAmd = selectedCPUs.some((c) => c.toLowerCase() === "amd");
      const hasIntel = selectedCPUs.some((c) => c.toLowerCase() === "intel");
      data = data.filter((i) => {
        const cpu = (i.specs?.CPU ?? "").toLowerCase();
        if (
          hasAmd &&
          (cpu.includes("ryzen") ||
            cpu.includes("r3") ||
            cpu.includes("r5") ||
            cpu.includes("r7") ||
            cpu.includes("amd"))
        )
          return true;
        if (
          hasIntel &&
          (cpu.includes("intel") ||
            cpu.includes("core") ||
            cpu.includes("i3") ||
            cpu.includes("i5") ||
            cpu.includes("i7") ||
            cpu.includes("i9"))
        )
          return true;
        return false;
      });
    }

    if (stores?.length)
      data = data.filter((i) =>
        stores.some((s) => i.store?.toLowerCase().includes(s.toLowerCase()))
      );

    if (isStocked === true) data = data.filter((i) => i.price > 0);

    // ── Sort ──────────────────────────────────────────────────────────────────
    if (orderBy === "lowToHigh") data.sort((a, b) => a.price - b.price);
    if (orderBy === "highToLow") data.sort((a, b) => b.price - a.price);

    // ── Paginate ──────────────────────────────────────────────────────────────
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

    res.json({
      data: paginatedData,
      pagination: { totalItems, totalPages, currentPage: page, pageSize },
    });
  } catch (err) {
    console.error("[api/products] Error:", err);
    res.status(500).json({ error: err.message });
  }
}
