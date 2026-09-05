/**
 * product.mjs — single product lookup for detail pages.
 *
 * GET /api/product/:slug → { product, similar }
 *
 * `similar` mirrors the DetailPage logic: same GPU key, in stock,
 * price within ±25%, max 4 items. `product.fpScore` is precomputed
 * server-side over the whole catalogue (same median normalisation
 * as the client).
 */

import { Router } from "express";
import { loadCatalog, findBySlug } from "../lib/productIndex.mjs";
import { getPriceHistory } from "../lib/priceHistory.mjs";

const router = Router();

router.get("/:slug", async (req, res) => {
  try {
    const products = await loadCatalog();
    const product = findBySlug(products, req.params.slug);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const similar = products
      .filter(
        (p) =>
          p !== product &&
          p.gpuKey &&
          product.gpuKey &&
          p.gpuKey === product.gpuKey &&
          p.stoktaVarMi &&
          Math.abs(p.fiyat - product.fiyat) / product.fiyat < 0.25
      )
      .slice(0, 4);

    const priceHistory = await getPriceHistory(product.slug);

    res.json({ product, similar, priceHistory });
  } catch (err) {
    console.error("[product] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
