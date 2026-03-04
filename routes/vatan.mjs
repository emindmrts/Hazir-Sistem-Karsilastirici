import { Router } from "express";
import { JSDOM } from "jsdom";
import { fetchHtml, parsePrice, normalise } from "../lib/scraper-utils.mjs";

const router = Router();

const BASE = "https://www.vatanbilgisayar.com/oem-hazir-sistemler/";

async function getTotalPages() {
  const html = await fetchHtml(BASE, { timeoutMs: 20_000, retries: 2 });
  const { document: doc } = new JSDOM(html).window;
  const nums = Array.from(doc.querySelectorAll(".pagination__item"))
    .map((el) => parseInt(el.textContent.trim()))
    .filter((n) => !isNaN(n));
  return nums.length ? Math.max(...nums) : 1;
}

async function scrapePage(url) {
  const html = await fetchHtml(url, { timeoutMs: 25_000, retries: 2 });
  const { document: doc } = new JSDOM(html).window;
  const products = [];

  doc.querySelectorAll(".product-list.product-list--list-page .product-list-link").forEach((el) => {
    const name = el.querySelector(".product-list__product-name h3")?.textContent.trim() ?? "N/A";
    const priceText = el.querySelector(".product-list__price")?.textContent ?? "0";
    const price = parsePrice(priceText);
    const image = el.querySelector(".product-list__image-safe img")?.getAttribute("data-src") ?? null;
    const href = el.getAttribute("href") ?? "";
    const url2 = href.startsWith("http") ? href : `https://www.vatanbilgisayar.com${href}`;

    const specs = {};
    el.querySelectorAll(".productlist_spec ul li p").forEach((p) => {
      const key = p.querySelector("#specname")?.textContent.trim() ?? "";
      const val = p.querySelector("#specvalue")?.textContent.trim() ?? "";
      if (key.includes("İşlemci Numarası")) specs.CPU = val;
      else if (key.includes("Grafik İşlemci")) specs.GPU = val;
      else if (key.includes("Anakart")) specs.Motherboard = val;
      else if (key.includes("Ram")) specs.RAM = val;
      else if (key.includes("Depolama") || key.includes("SSD") || key.includes("HDD")) specs.SSD = val;
    });

    products.push(normalise({ name, price, image, url: url2, specs }, "vatan"));
  });

  return products;
}

async function scrapeAllPages() {
  const totalPages = await getTotalPages();
  const urls = Array.from({ length: totalPages }, (_, i) =>
    i === 0 ? BASE : `${BASE}?page=${i + 1}`
  );
  const results = await Promise.allSettled(urls.map(scrapePage));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
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
