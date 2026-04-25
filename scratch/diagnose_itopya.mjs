import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

async function diagnose() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    
    console.log("Navigating to https://www.itopya.com/oem-paketler...");
    await page.goto("https://www.itopya.com/oem-paketler", { waitUntil: "networkidle2", timeout: 60000 });

    const data = await page.evaluate(() => {
      const firstProduct = document.querySelector(".product");
      if (!firstProduct) return { hasProduct: false };
      
      const allText = firstProduct.innerText;
      const allLinks = Array.from(firstProduct.querySelectorAll("a")).map(a => ({ text: a.innerText, href: a.href }));
      const allAmounts = Array.from(firstProduct.querySelectorAll(".amount, .price, [class*='price']")).map(el => ({ class: el.className, text: el.innerText }));

      return {
        hasProduct: true,
        allText,
        allLinks,
        allAmounts
      };
    });

    console.log("Diagnostics Data:", JSON.stringify(data, null, 2));

    // Check if ?pg=2 works
    console.log("Checking if ?pg=2 works...");
    await page.goto("https://www.itopya.com/oem-paketler?pg=2", { waitUntil: "networkidle2", timeout: 60000 });
    const pg2Data = await page.evaluate(() => {
        const firstProduct = document.querySelector(".product");
        return {
            hasProduct: !!firstProduct,
            productName: firstProduct ? (firstProduct.querySelector("h3")?.textContent || firstProduct.querySelector("a")?.textContent || "Unknown") : "N/A"
        };
    });
    console.log("Page 2 Data:", JSON.stringify(pg2Data, null, 2));

  } catch (error) {
    console.error("Error during diagnosis:", error);
  } finally {
    await browser.close();
  }
}

diagnose();
