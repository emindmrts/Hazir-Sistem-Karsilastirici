import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function checkSite(name, url, selectors) {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    const title = await page.title();
    console.log(`\n===== ${name} =====`);
    console.log(`Title: ${title}`);

    for (const sel of selectors) {
      const count = await page.evaluate(s => document.querySelectorAll(s).length, sel);
      console.log(`  ${sel}: ${count}`);
    }

    // Get first product card HTML snippet
    const snippet = await page.evaluate(() => {
      const candidates = [
        ".product-column", ".product-card", "li.product", ".card-product",
        "[class*='product-item']", "[class*='product_item']", "[class*='ProductCard']",
        ".product", ".item", ".urun", ".card"
      ];
      for (const sel of candidates) {
        const el = document.querySelector(sel);
        if (el) return `[${sel}] => ` + el.outerHTML.substring(0, 300);
      }
      return "No common product selector found";
    });
    console.log(`  First match: ${snippet.substring(0, 400)}`);

    // Pagination check
    const paginationSnippet = await page.evaluate(() => {
      const pag = document.querySelector(".pagination, .page-numbers, .pages, nav[aria-label]");
      return pag ? pag.outerHTML.substring(0, 300) : "No pagination found";
    });
    console.log(`  Pagination: ${paginationSnippet.substring(0, 200)}`);

  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  } finally {
    await browser.close();
  }
}

await checkSite("Itopya", "https://www.itopya.com/oem-paketler", [
  ".product-column", ".product-card", ".urun", ".product-item", "[class*='product']"
]);

await checkSite("GamingGen", "https://www.gaming.gen.tr/kategori/hazir-sistemler/", [
  "li.product", ".product", ".pc-specs-title", "[class*='product']"
]);

await checkSite("PCKolik", "https://pckolik.com.tr/kategori/oem-paketler", [
  ".product-card", ".product-item", ".card", "[class*='product']"
]);

await checkSite("GencerGaming", "https://www.gencergaming.com/hazir-sistemler", [
  ".card-product", ".product-card", ".product", ".urun", "[class*='product']", "[class*='card']"
]);

console.log("\n✅ Diagnose complete.");
