import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const router = express.Router();

async function scrapePage(browser, url) {
  const page = await browser.newPage();
  try {
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".card-product"));
      return items.map(item => {
        const titleElement = item.querySelector(".title.hzr");
        const name = titleElement ? titleElement.textContent.trim() : "N/A";
        const link = item.querySelector(".c-p-i-link")?.href || null;
        const image = item.querySelector(".image img")?.src || null;
        
        // Fiyat parse
        const priceElement = item.querySelector(".sale-price");
        const match = priceElement ? priceElement.textContent.replace(/[^\d,]/g, "").replace(",", ".") : "0";
        const price = parseFloat(match) || 0;

        // Specs
        const specs = {};
        const specItems = Array.from(item.querySelectorAll(".attributes .nitelik li"));
        specItems.forEach(li => {
            const img = li.querySelector("img");
            const value = li.querySelector(".value")?.textContent.trim();
            if (img && value) {
                const src = img.src.toLowerCase();
                if (src.includes("islemci")) specs.CPU = value;
                else if (src.includes("ekran_kart")) specs.GPU = value;
                else if (src.includes("ram")) specs.Ram = value;
                else if (src.includes("depolama")) specs.Storage = value;
                else if (src.includes("anakart")) specs.Motherboard = value;
            }
        });

        return { name, price, image, link, specs, store: "gencergaming" };
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
    const baseUrl = "https://www.gencergaming.com/hazir-sistemler";
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 60000 });
    
    // Find total pages
    const totalPages = await page.evaluate(() => {
        const pages = Array.from(document.querySelectorAll(".pagination li a"))
            .map(el => parseInt(el.textContent))
            .filter(n => !isNaN(n));
        return pages.length ? Math.max(...pages) : 1;
    });
    await page.close();

    console.log(`Found ${totalPages} pages for GencerGaming`);

    const results = [];
    for (let i = 1; i <= totalPages; i++) {
        const url = `${baseUrl}?sayfa=${i}`;
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
