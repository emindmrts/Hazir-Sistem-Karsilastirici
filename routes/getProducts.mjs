/**
 * getProducts.mjs — filtered, sorted, paginated product endpoint.
 *
 * POST /api/getProducts { stores?, searchStr?, minPrice?, maxPrice?,
 *   cpuBrands?, cpuSeries?, cpuModels?, gpuBrands?, gpuSeries?,
 *   inStock?, page?, pageSize?, sortOrder? }
 * → { data: [...60 items...], pagination: { totalItems, totalPages, … } }
 *
 * Data comes from lib/productIndex.mjs (per-store partitions with
 * mock.json fallback, in-memory cache). The client downloads ~50KB
 * per page instead of the full ~2MB catalogue.
 */

import { Router } from "express";
import { loadCatalog } from "../lib/productIndex.mjs";
import { filterProducts } from "../lib/filterProducts.mjs";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const products = await loadCatalog();
    res.json(filterProducts(products, req.body ?? {}));
  } catch (err) {
    console.error("[getProducts] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
