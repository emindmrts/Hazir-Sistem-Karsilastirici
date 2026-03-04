import { Router } from "express";
import { JSDOM } from "jsdom";
import { fetchHtml, parsePrice, normalise } from "../lib/scraper-utils.mjs";

const router = Router();

const BASE = "https://www.tebilon.com/hazir-sistemler/";

async function getTotalPages() {
  const html = await fetchHtml(BASE, { timeoutMs: 20_000, retries: 2 });
  const { document: doc } = new JSDOM(html).window;
  const nums = Array.from(doc.querySelectorAll(".productSort__pagination a"))
    .map((a) => parseInt(a.textContent.trim()))
    .filter((n) => !isNaN(n));
  return nums.length ? Math.max(...nums) : 1;
}

async function scrapeListPage(url) {
  const html = await fetchHtml(url, { timeoutMs: 25_000, retries: 2 });
  const { document: doc } = new JSDOM(html).window;
  const products = [];

  let els = Array.from(doc.querySelectorAll(".showcase__product"));
  if (els.length > 40) els = els.slice(0, 40);

  els.forEach((el) => {
    const nameEl = el.querySelector(".showcase__title a");
    const name = nameEl?.textContent.trim() ?? "N/A";
    const rawHref = nameEl?.getAttribute("href") ?? "";
    const productUrl = rawHref.startsWith("http")
      ? rawHref
      : rawHref
        ? `https://www.tebilon.com${rawHref.startsWith("/") ? "" : "/"}${rawHref}`
        : "";

    const priceText = el.querySelector(".newPrice")?.textContent ?? "0";
    const price = parsePrice(priceText);
    const image = el.querySelector(".showcase__image img")?.getAttribute("src") ?? null;

    products.push({ name, price, image, url: productUrl });
  });

  return products;
}

async function scrapeDetails(url) {
  if (!url) return {};
  try {
    const html = await fetchHtml(url, { timeoutMs: 20_000, retries: 2 });
    const { document: doc } = new JSDOM(html).window;
    const map = {};
    doc.querySelectorAll(".spec-head").forEach((el) => {
      const key = el.querySelector(".spec-sub-title span")?.textContent.trim() ?? "";
      const val = el.querySelector(".spec-detail span")?.textContent.trim() ?? "";
      if (key) map[key] = val;
    });
    return {
      CPU: map["İşlemci Modeli"] ?? null,
      GPU: map["Grafik İşlemci"] ?? null,
      RAM: map["Ram Kapasitesi"] ?? null,
      SSD: [map["Depolama Kapasitesi"], map["Depolama Türü"]].filter(Boolean).join(" ") || null,
      Motherboard: null,
    };
  } catch {
    return {};
  }
}

async function scrapeAllPages() {
  const totalPages = await getTotalPages();
  const urls = Array.from({ length: totalPages }, (_, i) => `${BASE}?page=${i + 1}`);

  const listResults = await Promise.allSettled(urls.map(scrapeListPage));
  const listItems = listResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  // Fetch details 8 at a time to avoid hammering the server
  const BATCH = 8;
  const withDetails = [];
  for (let i = 0; i < listItems.length; i += BATCH) {
    const batch = listItems.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map((p) => scrapeDetails(p.url)));
    batch.forEach((p, idx) => {
      const specs = settled[idx].status === "fulfilled" ? settled[idx].value : {};
      withDetails.push(normalise({ ...p, specs }, "tebilon"));
    });
  }

  return withDetails;
}

router.get("/", async (req, res) => {
  try {
    const products = await scrapeAllPages();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { scrapeAllPages };
export default router;
