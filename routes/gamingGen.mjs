import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const router = express.Router();

async function scrapePage(browser, url) {
  const page = await browser.newPage();
  try {
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll("li.product"));
      return items.map(item => {
        const titleElement = item.querySelector(".pc-specs-title");
        const name = titleElement ? titleElement.textContent.trim() : "N/A";
        const link = item.querySelector("a")?.href || null;
        const image = item.querySelector("img")?.src || null;
        
        // Fiyat parse
        const priceElement = item.querySelector(".price");
        let priceText = "";
        if (priceElement) {
            const ins = priceElement.querySelector("ins");
            priceText = ins ? ins.textContent : priceElement.textContent;
        }
        const match = priceText.replace(/[^\d,]/g, "").replace(",", ".");
        const price = parseFloat(match) || 0;

        // Specs
        const specs = {};
        const specItems = Array.from(item.querySelectorAll(".pc-specs-list li"));
        specItems.forEach((li, idx) => {
            const text = li.textContent.trim();
            if (idx === 0) specs.CPU = text;
            else if (idx === 1) specs.Motherboard = text;
            else if (idx === 2) specs.GPU = text;
            else if (idx === 3) specs.Ram = text;
            else if (idx === 4) specs.Storage = text;
        });

        return { name, price, image, link, specs, store: "gamingGen" };
      });
    });

    return products;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return [];
  } finally {
    await page.close();
  }
}

export async function scrapeAllPages() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const baseUrl = "https://www.gaming.gen.tr/kategori/hazir-sistemler/";
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    
    // Find total pages
    const totalPages = await page.evaluate(() => {
        const pageLinks = Array.from(document.querySelectorAll(".page-numbers:not(.next)"));
        const pageNumbers = pageLinks
            .map(el => {
                const text = el.textContent.trim().replace(/[^\d]/g, "");
                return parseInt(text, 10);
            })
            .filter(n => !isNaN(n));
        return pageNumbers.length ? Math.max(...pageNumbers) : 1;
    });
    await page.close();

    console.log(`Found ${totalPages} pages for GamingGen`);

    const results = [];
    const pagesToScrape = Math.min(totalPages, 60); 

    for (let i = 1; i <= pagesToScrape; i++) {
        const url = i === 1 ? baseUrl : `${baseUrl}page/${i}/`;
        const pageProducts = await scrapePage(browser, url);
        results.push(...pageProducts);
    }

    return results;
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
