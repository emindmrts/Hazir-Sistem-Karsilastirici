/**
 * api/products.js — Vercel Serverless Function
 *
 * Mirrors the Express route in routes/getProducts.mjs but exposed as a
 * Vercel-compatible handler. Catalogue loading + filter/sort/paginate
 * logic is shared via lib/.
 *
 * POST /api/products  →  filtered, sorted, paginated product list
 */

import { loadCatalog } from "../lib/productIndex.mjs";
import { filterProducts } from "../lib/filterProducts.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const products = await loadCatalog();
    res.json(filterProducts(products, req.body ?? {}));
  } catch (err) {
    console.error("[api/products] Error:", err);
    res.status(500).json({ error: err.message });
  }
}
