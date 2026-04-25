import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const router = express.Router();

async function parseProducts(page) {
  const products = await page.evaluate(() => {
    const productElements = Array.from(document.querySelectorAll(".product"));
    return productElements.map((product) => {
      const titleEl = Array.from(product.querySelectorAll("a")).find(a => a.textContent.trim().length > 0);
      const name = titleEl?.textContent.trim() || "N/A";
      const link = titleEl?.href || null;
      
      const imgEl = product.querySelector("img");
      const image = imgEl?.dataset?.src || imgEl?.src || null;
      
      const priceEl = product.querySelector(".product-price") || product.querySelector(".amount") || product.querySelector(".price-container");
      const priceText = priceEl?.textContent.trim() || "0";
      const price = parseFloat(priceText.replace(/[^\d,]/g, "").replace(",", ".")) || 0;

      const specs = {};
      const specItems = Array.from(product.querySelectorAll(".product-block-feature li, .advice-system-feature p"));
      specItems.forEach(li => {
          const text = li.textContent.trim();
          if (text.includes("İşlemci")) specs.CPU = text;
          else if (text.includes("Anakart")) specs.Motherboard = text;
          else if (text.includes("Ekran Kartı") || text.includes("ARC") || text.includes("RTX") || text.includes("RX ")) specs.GPU = text;
          else if (text.toLowerCase().includes("ram") || text.includes("DDR")) specs.Ram = text;
          else if (text.toLowerCase().includes("ssd") || text.includes("NVME")) specs.Storage = text;
      });

      return { name, price, image, link, specs, store: "itopya" };
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
    
    const baseUrl = "https://www.itopya.com/oem-paketler";
    let allProducts = [];
    let pageNum = 1;
    let hasMore = true;

    while (hasMore && pageNum <= 10) { 
        const url = `${baseUrl}?pg=${pageNum}`;
        console.log(`Scraping Itopya page ${pageNum}: ${url}`);
        
        let retryCount = 0;
        let success = false;
        while (retryCount < 3 && !success) {
            try {
                await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
                success = true;
            } catch (e) {
                console.warn(`Retry ${retryCount + 1} for page ${pageNum} due to error: ${e.message}`);
                retryCount++;
                await new Promise(r => setTimeout(r, 5000));
            }
        }

        if (!success) {
            console.error(`Failed to load page ${pageNum} after 3 retries. Skipping.`);
            pageNum++;
            continue;
        }
        
        // Wait for products to load
        try {
            await page.waitForSelector(".product", { timeout: 15000 });
        } catch (e) {
            console.log(`No products found on page ${pageNum} (selector timeout), stopping.`);
            hasMore = false;
            break;
        }

        const products = await parseProducts(page);
        if (products.length === 0) {
            hasMore = false;
        } else {
            allProducts = allProducts.concat(products);
            pageNum++;
            await new Promise(r => setTimeout(r, 2000)); // Small delay between pages
        }
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
