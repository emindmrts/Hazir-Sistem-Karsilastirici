/**
 * filterProducts.mjs — shared filter / sort / paginate logic.
 *
 * Used by both the Express route (routes/getProducts.mjs) and the
 * Vercel Serverless Function (api/products.js) so the two stay in sync.
 *
 * @param {Array} products  – raw product list from mock.json
 * @param {Object} f         – filter params (see below)
 * @returns {{ data: Array, pagination: Object }}
 */

export function filterProducts(products, f = {}) {
  let data = Array.isArray(products) ? products.slice() : [];

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
  } = f;

  // ── Normalise: ensure every item has `url` and numeric `price` ────────────────
  data = data.map((item) => ({
    ...item,
    url: item.url ?? item.link ?? "",
    price:
      typeof item.price === "number"
        ? item.price
        : parseFloat(String(item.price ?? 0)) || 0,
  }));

  // ── Filters ──────────────────────────────────────────────────────────────────
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

  // ── Sort ─────────────────────────────────────────────────────────────────────
  if (orderBy === "lowToHigh") data.sort((a, b) => a.price - b.price);
  if (orderBy === "highToLow") data.sort((a, b) => b.price - a.price);

  // ── Paginate ─────────────────────────────────────────────────────────────────
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

  return {
    data: paginatedData,
    pagination: { totalItems, totalPages, currentPage: page, pageSize },
  };
}