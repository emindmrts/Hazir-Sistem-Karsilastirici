import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const router = express.Router();

// Sayfa verilerini çekme fonksiyonu
async function fetchPageData(page) {
  try {
    const url = `https://www.gamegaraj.com/oem-paketler/?page=${page}`;
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Error fetching page ${page}: ${response.statusText}`);
    const text = await response.text();
    const dom = new JSDOM(text);
    return dom.window.document;
  } catch (error) {
    throw new Error(`Failed to fetch page ${page}: ${error.message}`);
  }
}

// Toplam sayfa sayısını alma fonksiyonu
async function getTotalPages() {
  try {
    const response = await fetch(
      `https://www.gamegaraj.com/oem-paketler/`
    );
    if (!response.ok)
      throw new Error(`Error fetching total pages: ${response.statusText}`);
    const text = await response.text();
    const dom = new JSDOM(text);
    const paginationLinks = Array.from(dom.window.document.querySelectorAll("a.products-pagination"));
    const pages = paginationLinks.map(a => a.textContent.trim()).filter(t => !isNaN(t)).map(Number);
    return pages.length > 0 ? Math.max(...pages) : 1;
  } catch (error) {
    throw new Error(`Failed to fetch total pages: ${error.message}`);
  }
}

// Ürünleri ayrıştırma fonksiyonu
function parseProducts(doc) {
  const productCards = Array.from(doc.querySelectorAll("div[data-product-id]"));
  
  return productCards.map((card) => {
    const titleElement = card.querySelector("a.text-xl.font-semibold.text-gray-900");
    const imageElement = card.querySelector("picture img") || card.querySelector("img");
    const priceElement = card.querySelector("p.text-3xl.font-extrabold");
    const specsElements = Array.from(card.querySelectorAll("ul.list-disc li"));

    // Fiyatı sayıya çevirme
    let priceText = priceElement ? priceElement.textContent.trim() : null;
    let priceNumber = null;

    if (priceText) {
      const normalizedPriceText = priceText
        .replace(/\./g, "")
        .replace(/,/g, ".")
        .replace(/[^0-9.]/g, "");
      priceNumber = parseFloat(normalizedPriceText);
    }

    // Teknik özellikleri al
    const specsList = specsElements.map((li) => li.textContent.trim());

    // Function to find the GPU
    const findGPU = (list) => {
      return (
        list.find(
          (x) =>
            x.toLowerCase().includes("rtx") ||
            x.toLowerCase().includes("gtx") ||
            x.toLowerCase().includes("rx") ||
            x.toLowerCase().includes("arc")
        ) || "N/A"
      );
    };

    // Function to find the RAM
    const findRAM = (list) => {
      return (
        list
          .find(
            (x) =>
              (x.toLowerCase().includes("mhz") &&
                x.toLowerCase().includes("gb")) ||
              x.toLowerCase().includes("ram") ||
              x.toLowerCase().includes("cl")
          ) || "N/A"
      );
    };

    // Function to find the Storage
    const findStorage = (list) => {
      return (
        list
          .find(
            (x) =>
              (x.toLowerCase().includes("ssd") ||
                x.toLowerCase().includes("m.2") ||
                x.toLowerCase().includes("m2") ||
                x.toLowerCase().includes("nvme")) &&
              (x.toLowerCase().includes("gb") || x.toLowerCase().includes("tb"))
          ) || "N/A"
      );
    };

    // Building the specs object
    const specs = {
        "CPU": specsList.find(x => x.toLowerCase().includes("işlemci") || x.toLowerCase().includes("cpu")) || specsList[0] || "N/A",
        "Motherboard": specsList.find(x => x.toLowerCase().includes("anakart") || x.toLowerCase().includes("mb")) || specsList[1] || "N/A",
        "GPU": findGPU(specsList),
        "Ram": findRAM(specsList),
        "Storage": findStorage(specsList)
    };

    return {
      image: imageElement ? (imageElement.getAttribute("src") || imageElement.src) : null,
      name: titleElement ? titleElement.textContent.trim() : null,
      price: priceNumber,
      link: titleElement ? `https://www.gamegaraj.com${titleElement.getAttribute("href")}` : null,
      specs: specs,
      store: "gameGaraj",
    };
  });
}

// Tüm ürünleri almak için fonksiyon
async function fetchAllProducts(totalPages) {
  let allProducts = [];
  for (let page = 1; page <= totalPages; page++) {
    try {
      const doc = await fetchPageData(page);
      const products = parseProducts(doc);
      allProducts = allProducts.concat(products);
    } catch (error) {
      console.error(
        `Error fetching products from page ${page}: ${error.message}`
      );
      // Hata mesajını istemciye iletmek yerine sadece loglama yapıyoruz
    }
  }
  return allProducts;
}

router.get("/", async (req, res) => {
  try {
    const totalPages = await getTotalPages();
    const products = await fetchAllProducts(totalPages);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function scrapeAllPages() {
  const totalPages = await getTotalPages();
  return fetchAllProducts(totalPages);
}

export { scrapeAllPages };
export default router;
