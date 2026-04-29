import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const router = express.Router();

async function scrapePage(browser, url) {
  const page = await browser.newPage();
  try {
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    
    // Cloudflare bypass wait
    try {
        await page.waitForSelector("li.product", { timeout: 15000 });
    } catch (e) {
        console.log("Product selector not found, might be blocked or empty page.");
    }

    const products = await page.evaluate(() => {
      // Selector fallbacks for container
      let items = Array.from(document.querySelectorAll("li.product"));
      if (items.length === 0) items = Array.from(document.querySelectorAll(".product"));
      if (items.length === 0) items = Array.from(document.querySelectorAll(".pc-specs-list-container")); // Alternate layout

      return items.map(item => {
        // Selector fallbacks for title
        const titleSelectors = [".pc-specs-title", ".woocommerce-loop-product__title", "h2", "h3", ".product-title"];
        let name = "N/A";
        for (const sel of titleSelectors) {
          const el = item.querySelector(sel);
          if (el && el.textContent.trim()) {
            name = el.textContent.trim();
            break;
          }
        }
        const link = item.querySelector("a")?.href || null;
        const imgEl = item.querySelector("img");
        const image = imgEl ? (imgEl.getAttribute("data-lazy-src") || imgEl.getAttribute("data-src") || imgEl.src) : null;
        
        // Fiyat parse
        const priceElement = item.querySelector(".price");
        let priceText = "";
        if (priceElement) {
            const ins = priceElement.querySelector("ins");
            priceText = ins ? ins.textContent : priceElement.textContent;
        }
        const match = priceText.replace(/[^\d,]/g, "").replace(",", ".");
        const price = parseFloat(match) || 0;

        // Specs (Smart Finder)
        const specs = { CPU: "N/A", Motherboard: "N/A", GPU: "N/A", Ram: "N/A", Storage: "N/A" };
        const specItems = Array.from(item.querySelectorAll(".pc-specs-list li")).map(li => li.textContent.trim());
        
        const find = (kws) => specItems.find(x => kws.some(k => x.toLowerCase().includes(k.toLowerCase()))) || "N/A";
        
        specs.CPU = find(["islemci", "cpu", "ryzen", "core", "intel", "amd", "i3", "i5", "i7", "i9"]);
        specs.Motherboard = find(["anakart", "mb", "b450", "b550", "a520", "h610", "b650", "a620", "b760", "z790", "b660", "x670"]);
        specs.GPU = find(["rtx", "gtx", "rx ", "arc", "radeon", "ekran"]);
        specs.Ram = find(["mhz", "ram", "ddr", "cl"]);
        specs.Storage = find(["ssd", "m.2", "nvme", "tb"]);

        // Name fallback for specs
        if (specs.CPU === "N/A" && name !== "N/A") {
            const cpuMatch = name.match(/(INTEL[\w\s]+|AMD[\w\s]+|INTE\s+U\d[\w\s]+)/i);
            if (cpuMatch) specs.CPU = cpuMatch[1].trim();
        }
        if (specs.GPU === "N/A" && name !== "N/A") {
            const gpuMatch = name.match(/((?:RTX|GTX|RX|ARC|RADEON)\s*\d+[\w\s]*)/i);
            if (gpuMatch) specs.GPU = gpuMatch[1].trim();
        }

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
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 90000 });
    
    // Wait for content or bypass
    try {
        await page.waitForSelector("li.product", { timeout: 20000 });
    } catch(e) {
        console.log("Initial page load timed out or blocked.");
    }
    
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
        if (pageProducts.length > 0) {
            results.push(...pageProducts);
        } else if (i > 1) {
            // If we get 0 products on a subpage, maybe we reached the end or got blocked
            console.log(`No products found on page ${i}, stopping.`);
            break;
        }
        // Random delay to avoid bot detection
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
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
