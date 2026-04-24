import { Router } from "express";
import { JSDOM } from "jsdom";
import { launchBrowser, parsePrice, normalise } from "../lib/scraper-utils.mjs";

const router = Router();

const BASE = "https://www.sinerji.gen.tr/oyun-icin-oem-paketler-c-2202";

function parseTotalPages(doc) {
  const links = Array.from(doc.querySelectorAll(".paging a"));
  const nums = links.map((a) => parseInt(a.textContent.trim())).filter((n) => !isNaN(n));
  return nums.length ? Math.max(...nums) : 1;
}

function parseProducts(doc) {
  const products = [];

  doc.querySelectorAll(".product").forEach((el) => {
    const nameEl = el.querySelector(".title a");
    const name = nameEl?.textContent.trim() ?? "N/A";

    // Fix URL — relative href needs the origin
    const rawHref = el.querySelector(".img a")?.getAttribute("href") ?? "";
    const url2 = rawHref.startsWith("http")
      ? rawHref
      : `https://www.sinerji.gen.tr${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

    const priceText = el.querySelector(".price")?.textContent ?? "0";
    const price = parsePrice(priceText);
    const image = el.querySelector(".img img")?.getAttribute("src") ?? null;

    const specs = {};
    el.querySelectorAll(".technicalSpecs li").forEach((li) => {
      const [specName = "", specValue = ""] = li.textContent.split(":").map((s) => s.trim());
      if (specName.includes("İşlemci Modeli")) specs.CPU = specValue;
      else if (specName.includes("Ekran Kartı")) specs.GPU = specValue;
      else if (specName.includes("Anakart")) specs.Motherboard = specValue;
      else if (specName.includes("RAM")) specs.RAM = specValue;
      else if (specName.includes("SSD") || specName.includes("Depolama")) specs.SSD = specValue;
    });

    products.push(normalise({ name, price, image, url: url2, specs }, "sinerji"));
  });

  return products;
}

async function scrapeAllPages() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE}`, { waitUntil: "networkidle2", timeout: 60_000 });
    const firstContent = await page.content();
    const firstDoc = new JSDOM(firstContent).window.document;
    const totalPages = parseTotalPages(firstDoc);

    let products = parseProducts(firstDoc);

    for (let p = 2; p <= totalPages; p++) {
      await page.goto(`${BASE}?px=${p}`, { waitUntil: "networkidle2", timeout: 60_000 });
      const html = await page.content();
      products = products.concat(parseProducts(new JSDOM(html).window.document));
    }

    return products;
  } finally {
    await browser.close();
  }
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
