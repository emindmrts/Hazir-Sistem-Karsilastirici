import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

import { scrapeAllPages as scrapeItopya } from "./routes/itopya.mjs";
import { scrapeAllPages as scrapePCKolik } from "./routes/pckolik.mjs";

async function testScraper(name, scraperFn) {
  console.log(`\nTesting ${name}...`);
  try {
    const start = Date.now();
    const products = await scraperFn();
    console.log(`✅ ${name} finished in ${Date.now() - start}ms. Found ${products.length} products.`);
    if (products.length > 0) {
      console.log('Sample product:', products[0]);
    }
  } catch (err) {
    console.log(`❌ ${name} failed:`, err);
  }
}

(async () => {
  await testScraper("Itopya", scrapeItopya);
  await testScraper("PCKolik", scrapePCKolik);
  process.exit(0);
})();
