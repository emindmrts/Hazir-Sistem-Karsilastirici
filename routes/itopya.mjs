import { Router } from "express";
import { launchBrowser, parsePrice, normalise } from "../lib/scraper-utils.mjs";

const router = Router();

const BASE_URL = "https://www.itopya.com/HazirSistemler";

async function parseTotalPages(page) {
  try {
    const info = await page.$eval(".page-info strong", (el) => el.textContent.trim());
    return parseInt(info.split("/")[1], 10) || 1;
  } catch {
    return 1;
  }
}

async function parseProducts(page) {
  return page.$$eval(".product", (els) =>
    els.map((product) => {
      const image = product.querySelector(".product-header .image img")?.dataset.src ?? null;
      const name = product.querySelector(".title")?.textContent.trim() ?? "N/A";
      const link = "https://www.itopya.com" + (product.querySelector(".title")?.getAttribute("href") ?? "");
      const priceRaw = product.querySelector(".price strong")?.textContent ?? "0";

      const specsRaw = Array.from(product.querySelectorAll(".product-body ul li")).map((li) => ({
        text: li.querySelector("p")?.textContent.trim() ?? "",
      }));

      const find = (...kws) =>
        (specsRaw.find((s) => kws.some((k) => s.text.toLowerCase().includes(k.toLowerCase()))) ?? {}).text ?? null;

      return {
        name,
        priceRaw,
        image,
        url: link,
        specsRaw,
        CPU: find("İşlemci"),
        GPU: find("Ekran Kartı"),
        RAM: find("Ram"),
        SSD: find("SSD"),
        Motherboard: find("Anakart"),
      };
    })
  );
}

async function scrapeAllPages() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}?pg=1`, { waitUntil: "networkidle2", timeout: 90_000 });
    const totalPages = await parseTotalPages(page);

    const rawAll = await parseProducts(page);

    for (let pg = 2; pg <= totalPages; pg++) {
      await page.goto(`${BASE_URL}?pg=${pg}`, { waitUntil: "networkidle2", timeout: 90_000 });
      const raw = await parseProducts(page);
      rawAll.push(...raw);
    }

    return rawAll.map((r) =>
      normalise({
        name: r.name,
        price: parsePrice(r.priceRaw),
        image: r.image,
        url: r.url,
        specs: {
          CPU: r.CPU,
          GPU: r.GPU,
          RAM: r.RAM,
          SSD: r.SSD,
          Motherboard: r.Motherboard,
        },
      }, "itopya")
    );
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
