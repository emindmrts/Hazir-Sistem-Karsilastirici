import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const router = express.Router();

async function parseProducts(page) {
  const products = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".product"));
    return items.map(el => {
      const nameEl = el.querySelector(".title a");
      const name = nameEl?.textContent.trim() ?? "N/A";
      const link = nameEl?.href || null;

      const priceText = el.querySelector(".price")?.textContent ?? "0";
      const match = priceText.replace(/[^\d,]/g, "").replace(",", ".");
      const price = parseFloat(match) || 0;
      
      const image = el.querySelector(".img img")?.src || null;

      const specs = {};
      el.querySelectorAll(".technicalSpecs li").forEach((li) => {
        const [specName = "", specValue = ""] = li.textContent.split(":").map((s) => s.trim());
        if (specName.includes("İşlemci Modeli")) specs.CPU = specValue;
        else if (specName.includes("Ekran Kartı")) specs.GPU = specValue;
        else if (specName.includes("Anakart")) specs.Motherboard = specValue;
        else if (specName.includes("RAM")) specs.RAM = specValue;
        else if (specName.includes("SSD") || specName.includes("Depolama")) specs.SSD = specValue;
      });

      return { name, price, image, link, specs, store: "sinerji" };
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
    
    const baseUrl = "https://www.sinerji.gen.tr/oyun-icin-oem-paketler-c-2202";
    console.log(`Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 60000 });

    const totalPages = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll(".paging a"));
        const nums = links.map((a) => parseInt(a.textContent.trim())).filter((n) => !isNaN(n));
        return nums.length ? Math.max(...nums) : 1;
    });

    console.log(`Found ${totalPages} pages for Sinerji`);

    let allProducts = [];
    for (let i = 1; i <= totalPages; i++) {
        const url = `${baseUrl}?px=${i}`;
        console.log(`Scraping Sinerji page ${i}: ${url}`);
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
