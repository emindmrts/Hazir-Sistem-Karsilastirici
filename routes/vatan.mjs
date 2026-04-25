import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const router = express.Router();

async function parseProducts(page) {
  const products = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".product-list.product-list--list-page .product-list-link"));
    return items.map(el => {
      const name = el.querySelector(".product-list__product-name h3")?.textContent.trim() ?? "N/A";
      const priceText = el.querySelector(".product-list__price")?.textContent ?? "0";
      const match = priceText.replace(/[^\d,]/g, "").replace(",", ".");
      const price = parseFloat(match) || 0;
      const image = el.querySelector(".product-list__image-safe img")?.src || el.querySelector(".product-list__image-safe img")?.dataset.src || null;
      const href = el.getAttribute("href") ?? "";
      const url = href.startsWith("http") ? href : `https://www.vatanbilgisayar.com${href}`;

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

      return { name, price, image, url, specs, store: "vatan" };
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
    
    const baseUrl = "https://www.vatanbilgisayar.com/oem-paketler/";
    console.log(`Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 60000 });

    const totalPages = await page.evaluate(() => {
        const nums = Array.from(document.querySelectorAll(".pagination__item"))
            .map((el) => parseInt(el.textContent.trim()))
            .filter((n) => !isNaN(n));
        return nums.length ? Math.max(...nums) : 1;
    });

    console.log(`Found ${totalPages} pages for Vatan`);

    let allProducts = [];
    for (let i = 1; i <= totalPages; i++) {
        const url = i === 1 ? baseUrl : `${baseUrl}?page=${i}`;
        console.log(`Scraping Vatan page ${i}: ${url}`);
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
