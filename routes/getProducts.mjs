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
import { getChange7dPct } from "../lib/priceHistory.mjs";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const products = await loadCatalog();
    const result = filterProducts(products, req.body ?? {});
    // Kart rozeti: her ürün için 7 günlük fiyat değişimi (isteğe bağlı).
    const changes = await Promise.all(
      result.data.map(async (p) => {
        const pct = p.slug ? await getChange7dPct(p.slug) : null;
        return { slug: p.slug, pct };
      })
    );
    for (const { slug, pct } of changes) {
      if (pct != null) {
        const target = result.data.find((p) => p.slug === slug);
        if (target) target.change7dPct = pct;
      }
    }
    res.json(result);
  } catch (err) {
    console.error("[getProducts] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
