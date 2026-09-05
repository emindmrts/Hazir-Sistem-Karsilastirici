/**
 * facets.mjs — dynamic filter options derived from the catalogue.
 *
 * GET /api/facets?cpuBrands=Intel&cpuSeries=Ryzen+5
 * → { cpuModels: { AMD: [...], Intel: [...] } }
 *
 * Ports the `availableCpuModels` useMemo in use-products.ts so the
 * CPU-model dropdown keeps working without downloading the catalogue.
 */

import { Router } from "express";
import { loadCatalog, matchCpuSeries } from "../lib/productIndex.mjs";

const router = Router();

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

router.get("/", async (req, res) => {
  try {
    const products = await loadCatalog();
    const cpuBrands = asArray(req.query.cpuBrands);
    const cpuSeries = asArray(req.query.cpuSeries);

    const amdModels = new Set();
    const intelModels = new Set();
    for (const p of products) {
      if (!p.islemciModel || !p.islemciMarka) continue;
      if (cpuBrands.length > 0 && !cpuBrands.includes(p.islemciMarka)) continue;
      if (cpuSeries.length > 0 && !matchCpuSeries(p.islemci, cpuSeries)) continue;
      if (p.islemciMarka === "AMD") amdModels.add(p.islemciModel);
      else if (p.islemciMarka === "Intel") intelModels.add(p.islemciModel);
    }

    res.json({
      cpuModels: {
        AMD: Array.from(amdModels).sort(),
        Intel: Array.from(intelModels).sort(),
      },
    });
  } catch (err) {
    console.error("[facets] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
