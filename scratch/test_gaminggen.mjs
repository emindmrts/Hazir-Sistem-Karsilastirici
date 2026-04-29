import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

async function test() {
  const browser = await puppeteer.launch({
    headless: false, // Set to true for actual scraping, false for debugging
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
  
  try {
    console.log("Navigating...");
    await page.goto("https://www.gaming.gen.tr/kategori/hazir-sistemler/", { waitUntil: "networkidle2", timeout: 60000 });
    
    // Wait a bit for Cloudflare
    await new Promise(r => setTimeout(r, 5000));
    
    const content = await page.content();
    console.log("Page title:", await page.title());
    
    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll("li.product"));
      return items.length;
    });
    
    console.log("Found products:", products);
    
    if (products === 0) {
        // Try alternate selector
        const altProducts = await page.evaluate(() => {
            return document.querySelectorAll(".product").length;
        });
        console.log("Found products (alt selector):", altProducts);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}

test();
