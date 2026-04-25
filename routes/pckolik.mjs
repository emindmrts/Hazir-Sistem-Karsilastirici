import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const router = express.Router();

async function parseProducts(page) {
  const products = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".product-card"));
    return items.map(card => {
      const name = card.querySelector(".name")?.textContent.trim() ?? "N/A";
      const priceText = card.querySelector(".product-price")?.textContent ?? "0";
      const price = parseFloat(priceText.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
      
      const imgEl = Array.from(card.querySelectorAll("img")).find(img => !img.src.includes("icon-star"));
      const image = imgEl ? (imgEl.dataset.src || imgEl.src) : null;
      
      const aEl = card.querySelector("a");
      const href = aEl ? aEl.getAttribute("href") : "";
      const url = href.startsWith("http") ? href : `https://pckolik.com.tr${href.startsWith("/") ? "" : "/"}${href}`;

      const features = Array.from(card.querySelectorAll("li")).map((s) => s.textContent.trim());
      const specs = {};
      const find = (...kws) => features.find((f) => kws.some((k) => f.toLowerCase().includes(k))) ?? null;

      specs.CPU = find("ryzen", "core", "islemci", "i̇şlemci");
      specs.GPU = find("rx ", "gtx", "rtx", "arc");
      specs.RAM = find("ram");
      specs.SSD = find("ssd", "nvme");
      specs.Motherboard = find("anakart");

      return { name, price, image, url, specs, store: "pckolik" };
    });
  });
  return products;
}

export async function scrapeAllPages() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    
    const baseUrl = "https://pckolik.com.tr/kategori/oem-paketler";
    console.log(`Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    const totalPages = await page.evaluate(() => {
        const pages = Array.from(document.querySelectorAll(".pagination a"))
            .map((a) => parseInt(a.textContent.trim()))
            .filter((n) => !isNaN(n));
        return pages.length ? Math.max(...pages) : 1;
    });

    console.log(`Found ${totalPages} pages for PCKolik`);

    let allProducts = [];
    for (let i = 1; i <= totalPages; i++) {
        const url = i === 1 ? baseUrl : `${baseUrl}?page=${i}`;
        console.log(`Scraping PCKolik page ${i}: ${url}`);
        if (i > 1) {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        }
        const products = await parseProducts(page);
        allProducts = allProducts.concat(products);
    }

    return allProducts;
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

export default router;
