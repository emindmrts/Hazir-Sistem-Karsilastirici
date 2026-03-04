import { Router } from "express";
import { JSDOM } from "jsdom";
import { fetchHtml, parsePrice, normalise } from "../lib/scraper-utils.mjs";

const router = Router();

const BASE = "https://pckolik.com/tr/pc/hazir-sistemler";

async function scrapePage(url) {
  const html = await fetchHtml(url, { timeoutMs: 30_000, retries: 3 });
  const { document: doc } = new JSDOM(html).window;
  const products = [];

  doc.querySelectorAll(".product-card.pc").forEach((card) => {
    const name = card.querySelector(".name")?.textContent.trim() ?? "N/A";
    const priceText = card.querySelector(".price-new span")?.textContent ?? "0";
    const price = parsePrice(priceText);
    const image = (() => {
      const src = card.querySelector(".img-crop img")?.getAttribute("src") ?? "";
      return src.startsWith("http") ? src : src ? `https://pckolik.com/${src.replace(/^\//, "")}` : null;
    })();
    const href = card.querySelector(".img-crop")?.getAttribute("href") ?? "";
    const url2 = href.startsWith("http") ? href : `https://pckolik.com${href.startsWith("/") ? "" : "/"}${href}`;

    const features = Array.from(card.querySelectorAll("ul li span")).map((s) => s.textContent.trim());
    const find = (...kws) => features.find((f) => kws.some((k) => f.toLowerCase().includes(k))) ?? null;

    products.push(normalise({
      name, price, image, url: url2,
      specs: {
        CPU: find("ryzen", "core", "islemci", "i̇şlemci"),
        GPU: find("rx ", "gtx", "rtx", "arc"),
        RAM: find("ram"),
        SSD: find("ssd", "nvme"),
        Motherboard: find("anakart"),
      },
    }, "pckolik"));
  });

  return products;
}

async function scrapeAllPages() {
  // Discover total pages from first page
  const html = await fetchHtml(BASE, { timeoutMs: 30_000, retries: 3 });
  const { document: doc } = new JSDOM(html).window;
  const pages = Array.from(doc.querySelectorAll(".pagination a"))
    .map((a) => parseInt(a.textContent.trim()))
    .filter((n) => !isNaN(n));
  const totalPages = pages.length ? Math.max(...pages) : 1;

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
