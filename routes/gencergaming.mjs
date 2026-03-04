import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const router = express.Router();

// Sayfa verilerini çekme fonksiyonu
async function fetchPageData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Error fetching page ${url}: ${response.statusText}`);
    const text = await response.text();
    const dom = new JSDOM(text);
    return dom.window.document;
  } catch (error) {
    throw new Error(`Failed to fetch page ${url}: ${error.message}`);
  }
}

// Toplam sayfa sayısını alma fonksiyonu
async function getTotalPages(baseUrl) {
  try {
    const doc = await fetchPageData(baseUrl);
    const totalPagesElement = doc.querySelector(
      ".pagination-nav .pagination li:nth-last-child(1) a"
    );
    return totalPagesElement
      ? parseInt(totalPagesElement.textContent.trim(), 10)
      : 1;
  } catch (error) {
    throw new Error(`Failed to fetch total pages: ${error.message}`);
  }
}

// Ürünleri ayrıştırma fonksiyonu
async function fetchAllProducts(urls) {
  const products = [];

  const fetchPromises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const productElements = doc.querySelectorAll(".card-product");

      productElements.forEach((productElement) => {
        const nameElement = productElement.querySelector(".title.hzr");
        const priceElement = productElement.querySelector(".sale-price");
        const imageElement = productElement.querySelector(".image img");
        const linkElement = productElement.querySelector(".c-p-i-link");

        if (!nameElement || !priceElement || !imageElement || !linkElement) {
          return;
        }

        const link = linkElement.href;
        const name = nameElement ? nameElement.textContent.trim() : "No name";

        // Parse the price
        const priceText = priceElement
          ? priceElement.textContent.trim().replace(" TL", "")
          : "0";

        const tprice = parseFloat(priceText.replace(".", "")) || 0;
        const price = tprice.toString().replace(",", "");

        const image = null;
        /* const image = imageElement
          ? imageElement.getAttribute("src")
          : "No image"; */

        const specs = {};

        productElement
          .querySelectorAll(".attributes .nitelik li")
          .forEach((specElement) => {
            const specIcon = specElement.querySelector("img").src;
            const specValue = specElement
              .querySelector(".value")
              .textContent.trim();
            if (specIcon.includes("islemci.png")) {
              specs["CPU"] = specValue;
            } else if (specIcon.includes("ekran_kart")) {
              specs["GPU"] = specValue;
            } else if (specIcon.includes("ram.png")) {
              specs["Ram"] = specValue + " Ram";
            } else if (specIcon.includes("depolama.png")) {
              specs["Storage"] = specValue;
            } else if (specIcon.includes("anakart.png")) {
              specs["Motherboard"] = specValue;
            }
          });

        products.push({
          name,
          price,
          image,
          link,
          specs,
          store: "gencergaming",
        });
      });
    } catch (error) {
      console.error("Error fetching URL:", url, error);
    }
  });

  await Promise.all(fetchPromises);
  return products;
}

function generateUrls(base, totalPages) {
  const urls = [];
  for (let i = 1; i <= totalPages; i++) {
    const url = `${base}${i}`;
    urls.push(url);
  }
  return urls;
}

async function scrapeAllPages() {
  const baseUrl = "https://www.gencergaming.com/hazir-sistemler?sayfa=";
  let totalPages = 1;
  try { totalPages = await getTotalPages(baseUrl); } catch { /* ignore */ }
  const urls = generateUrls(baseUrl, totalPages);
  return fetchAllProducts(urls);
}

router.get("/", async (req, res) => {
  try {
    const products = await scrapeAllPages();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export { scrapeAllPages };
export default router;
