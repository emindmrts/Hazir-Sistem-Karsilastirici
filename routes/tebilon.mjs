import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const router = express.Router();

async function parseProducts(page) {
  const products = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".showcase__product"));
    return items.map(el => {
      const nameEl = el.querySelector(".showcase__title a");
      const name = nameEl?.textContent.trim() ?? "N/A";
      const link = nameEl?.href || null;

      const priceText = el.querySelector(".newPrice")?.textContent ?? "0";
      const match = priceText.replace(/[^\d,]/g, "").replace(",", ".");
      const price = parseFloat(match) || 0;
      
      const image = el.querySelector(".showcase__image img")?.src || null;

      return { name, price, image, link, specs: {}, store: "tebilon" };
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
    
    const baseUrl = "https://www.tebilon.com/hazir-sistemler/";
    console.log(`Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 60000 });

    const totalPages = await page.evaluate(() => {
        const nums = Array.from(document.querySelectorAll(".productSort__pagination a"))
            .map((a) => parseInt(a.textContent.trim()))
            .filter((n) => !isNaN(n));
        return nums.length ? Math.max(...nums) : 1;
    });

    console.log(`Found ${totalPages} pages for Tebilon`);

    let allProducts = [];
    for (let i = 1; i <= totalPages; i++) {
        const url = `${baseUrl}?page=${i}`;
        console.log(`Scraping Tebilon page ${i}: ${url}`);
        if (i > 1) {
            await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
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
