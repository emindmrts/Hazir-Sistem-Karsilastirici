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
    
    console.log("Navigating to https://www.gamegaraj.com/oem-paketler/...");
    await page.goto("https://www.gamegaraj.com/oem-paketler/", { waitUntil: "networkidle2", timeout: 60000 });

    const data = await page.evaluate(() => {
      const firstProductName = document.querySelector("a.text-xl.font-semibold.text-gray-900");
      if (!firstProductName) return { hasProduct: false };
      
      const productCard = firstProductName.parentElement.parentElement.parentElement; // Go up more levels
      const allText = productCard.innerText;
      const potentialPrices = Array.from(productCard.querySelectorAll("div, p, span, strong"))
        .filter(el => /[\d.,]+\s*TL/i.test(el.innerText))
        .map(el => ({ class: el.className, text: el.innerText, tag: el.tagName }));

      return {
        hasProduct: true,
        allText,
        potentialPrices
      };
    });

    console.log("Diagnostics Data:", JSON.stringify(data, null, 2));

    // Check if ?page=2 works
    console.log("Checking if ?page=2 works...");
    await page.goto("https://www.gamegaraj.com/oem-paketler/?page=2", { waitUntil: "networkidle2", timeout: 60000 });
    const pg2Data = await page.evaluate(() => {
        const firstProductName = document.querySelector("a.text-xl.font-semibold.text-gray-900");
        return {
            hasProduct: !!firstProductName,
            productName: firstProductName?.textContent.trim()
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
