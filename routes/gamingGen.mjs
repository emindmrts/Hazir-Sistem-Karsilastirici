import express from "express";
import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// --- setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------- //
//  SCRAPER CORE LOGIC   //
// ---------------------- //

// Sayfadaki ürün ID'lerini alır
async function scrapeProductIDs(page, url) {
  try {
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    await page.waitForFunction(
      'typeof window.fiboFiltersData !== "undefined" && window.fiboFiltersData.base_products_ids.length > 0',
      { timeout: 60000 }
    );

    const productIDs = await page.evaluate(() => {
      return window.fiboFiltersData?.base_products_ids || [];
    });

    console.log(`Found ${productIDs.length} product IDs`);
    return productIDs;
  } catch (error) {
    console.error(`Error in scrapeProductIDs for ${url}:`, error);
    return [];
  }
}

// Ürün detaylarını çeker
async function scrapeProduct(page, url) {
  try {
    console.log(`Visiting: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Temel bilgiler
    const product = await page.evaluate(() => {
      const title = document.querySelector("h1.product_title")?.textContent?.trim() || "N/A";
      const priceText = document.querySelector("p.price")?.textContent || "";
      const image = document.querySelector(".woocommerce-product-gallery__image img")?.src || null;

      // Fiyat parse
      let price = 0;
      const match = priceText.replace(/[^\d,]/g, "").replace(",", ".");
      const numeric = parseFloat(match);
      if (!isNaN(numeric)) price = numeric;

      return { name: title, price, image };
    });

    // Tavsiye edilen bileşenler tablosu
    const specs = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".su-table table tbody tr"));
      const specs = {};

      for (const row of rows) {
        const cells = row.querySelectorAll("td");
        if (cells.length < 2) continue;
        const label = cells[0].innerText.trim().toLowerCase();
        const value = cells[1].querySelector("a")?.innerText.trim() || cells[1].innerText.trim();

        if (label.includes("işlemci")) specs.CPU = value;
        else if (label.includes("anakart")) specs.Motherboard = value;
        else if (label.includes("ekran kart")) specs.GPU = value;
        else if (label.includes("ram")) specs.Ram = value;
        else if (label.includes("ssd") || label.includes("depolama")) specs.Storage = value;
        else if (label.includes("kasa")) specs.Case = value;
      }

      return specs;
    });

    return { link: url, ...product, specs, store: "gamingGen" };
  } catch (error) {
    console.error(`Error scraping product at ${url}:`, error.message);
    return null;
  }
}

// ---------------------- //
//     EXPRESS ROUTE      //
// ---------------------- //

router.get("/", async (req, res) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const baseUrl = "https://www.gaming.gen.tr/kategori/hazir-sistemler/";

  console.log("Scraping started...");

  const productIDs = await scrapeProductIDs(page, baseUrl);
  const productURLs = productIDs.map((id) => `https://www.gaming.gen.tr/urun/${id}`);

  const results = [];
  for (const [i, productUrl] of productURLs.entries()) {
    console.log(`(${i + 1}/${productURLs.length}) Scraping: ${productUrl}`);
    const product = await scrapeProduct(page, productUrl);
    if (product) results.push(product);

    // İstekler arası kısa gecikme (bot korumasına yakalanmamak için)
    await new Promise((r) => setTimeout(r, 1500));
  }

  await browser.close();

  // Kaydet
  const filePath = path.join(__dirname, "..", "products.json");
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(results, null, 2));
    console.log(`✅ Products saved to ${filePath}`);
  } catch (error) {
    console.error("❌ Failed to save products:", error);
  }

  console.log("✅ Scraping finished!");
  res.json(results);
});

export default router;
