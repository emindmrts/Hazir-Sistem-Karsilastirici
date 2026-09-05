/**
 * filterProducts.mjs — shared filter / sort / paginate logic.
 *
 * Used by both the Express route (routes/getProducts.mjs) and the
 * Vercel Serverless Function (api/products.js) so the two stay in sync.
 *
 * Operates on NORMALISED products (see lib/productIndex.mjs — the same
 * normalise() the client applies). Filter semantics are behaviour-identical
 * ports of the `processedProducts` useMemo in client/src/hooks/use-products.ts.
 *
 * Accepted params (new client names + legacy aliases):
 *   searchStr/searchTerm, minPrice/startPrice, maxPrice/endPrice,
 *   stores[], cpuBrands[] (+ legacy selectedCPUs ["amd"/"intel"]),
 *   cpuSeries[], cpuModels[], gpuBrands[] (+ legacy selectedGPUs),
 *   gpuSeries[], inStock (bool, default true like the client) / isStocked,
 *   page, pageSize, sortOrder ("lowToHigh"/"highToLow", legacy orderBy).
 *
 * @param {Array} products  – normalised product list
 * @param {Object} f        – filter params (see above)
 * @returns {{ data: Array, pagination: Object }}
 */

import { matchCpuSeries, matchGpuBrand } from "./productIndex.mjs";

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

export function filterProducts(products, f = {}) {
  let data = Array.isArray(products) ? products.slice() : [];

  const searchStr = f.searchStr ?? f.searchTerm ?? "";
  const minPrice = f.minPrice ?? f.startPrice ?? "";
  const maxPrice = f.maxPrice ?? f.endPrice ?? "";
  const stores = asArray(f.stores);
  const cpuBrands = asArray(f.cpuBrands);
  const selectedCPUs = asArray(f.selectedCPUs);
  const cpuSeries = asArray(f.cpuSeries);
  const cpuModels = asArray(f.cpuModels);
  const gpuBrands = asArray(f.gpuBrands ?? f.selectedGPUs);
  const gpuSeries = asArray(f.gpuSeries);
  // Client default is inStock:true — mirror it unless explicitly disabled.
  const inStock = f.inStock ?? (f.isStocked === true ? true : f.isStocked === false ? false : true);
  const page = Math.max(1, Number(f.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(f.pageSize) || 60));
  const sortOrder = f.sortOrder ?? f.orderBy ?? "lowToHigh";

  // ── Filters (same order as the client) ─────────────────────────────────────
  if (inStock) data = data.filter((p) => p.stoktaVarMi);

  if (String(searchStr).trim()) {
    const q = String(searchStr).toLowerCase();
    data = data.filter(
      (p) =>
        (p.sistemAdi ?? "").toLowerCase().includes(q) ||
        (p.islemci && p.islemci.toLowerCase().includes(q)) ||
        (p.ekranKarti && p.ekranKarti.toLowerCase().includes(q))
    );
  }

  if (stores.length)
    data = data.filter((p) =>
      stores.some((s) => (p.magaza ?? "").toLowerCase().includes(String(s).toLowerCase()))
    );

  if (cpuBrands.length)
    data = data.filter((p) => p.islemciMarka && cpuBrands.includes(p.islemciMarka));

  // Legacy brand filter: selectedCPUs: ["amd"] / ["intel"]
  if (selectedCPUs.length) {
    const want = new Set(selectedCPUs.map((c) => String(c).toLowerCase()));
    data = data.filter(
      (p) =>
        (want.has("amd") && p.islemciMarka === "AMD") ||
        (want.has("intel") && p.islemciMarka === "Intel")
    );
  }

  if (cpuSeries.length)
    data = data.filter((p) => matchCpuSeries(p.islemci, cpuSeries));

  if (cpuModels.length)
    data = data.filter((p) => p.islemciModel && cpuModels.includes(p.islemciModel));

  if (gpuBrands.length)
    data = data.filter((p) => matchGpuBrand(p.ekranKarti, gpuBrands));

  if (gpuSeries.length)
    data = data.filter((p) => {
      if (!p.ekranKarti) return false;
      const t = p.ekranKarti.toUpperCase();
      return gpuSeries.some((s) => t.includes(String(s).toUpperCase()));
    });

  if (minPrice !== "" && minPrice != null) data = data.filter((p) => p.fiyat >= Number(minPrice));
  if (maxPrice !== "" && maxPrice != null) data = data.filter((p) => p.fiyat <= Number(maxPrice));

  // ── Sort (price only — same as the client) ──────────────────────────────────
  data.sort((a, b) => (sortOrder === "highToLow" ? b.fiyat - a.fiyat : a.fiyat - b.fiyat));

  // ── Paginate ───────────────────────────────────────────────────────────────
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

  return {
    data: paginatedData,
    pagination: { totalItems, totalPages, currentPage: page, pageSize },
  };
}
