import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const router = express.Router();

async function parseProducts(page) {
  const products = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll("#product-grid > div"));
    return items.map(el => {
      const nameEl = el.querySelector("p.text-lg.font-semibold");
      const name = nameEl?.textContent.trim() ?? "N/A";
      const linkEl = el.querySelector("a[itemprop='url']") || el.querySelector("a.flex.items-center.justify-center");
      const link = linkEl?.href || null;

      const priceData = el.querySelector("a[data-product]")?.getAttribute("data-product");
      let price = 0;
      if (priceData) {
          try {
              const parsed = JSON.parse(priceData);
              price = parsed.price || 0;
          } catch(e) {}
      } else {
          const priceEl = el.querySelector(".text-orange-500") || el.querySelector(".font-bold.text-orange-500");
          if (priceEl) {
              price = parseFloat(priceEl.textContent.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
          }
      }

      const image = el.querySelector("img")?.src || null;

      const specs = {};
      el.querySelectorAll("ul li").forEach((li) => {
        const text = li.textContent.trim();
        if (text.includes("AMD") || text.includes("Intel")) specs.CPU = text;
        else if (text.includes("RTX") || text.includes("RX") || text.includes("GTX") || text.includes("ARC")) specs.GPU = text;
        else if (text.includes("DDR4") || text.includes("DDR5")) specs.RAM = text;
        else if (text.includes("SSD")) specs.SSD = text;
      });

      return { name, price, image, link, specs, store: "inceHesap" };
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
    
    const baseUrl = "https://www.incehesap.com/hazir-sistemler-fiyatlari/";
    console.log(`Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 60000 });

    const totalPages = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("nav a"));
        const nums = links.map((a) => parseInt(a.textContent.trim())).filter((n) => !isNaN(n));
        return nums.length ? Math.max(...nums) : 1;
    });

    console.log(`Found ${totalPages} pages for InceHesap`);

    let allProducts = [];
    for (let i = 1; i <= totalPages; i++) {
        const url = i === 1 ? baseUrl : `${baseUrl}sayfa-${i}/`;
        console.log(`Scraping InceHesap page ${i}: ${url}`);
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
