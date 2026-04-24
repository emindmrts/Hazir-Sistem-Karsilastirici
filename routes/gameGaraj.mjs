import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const router = express.Router();

// Sayfa verilerini çekme fonksiyonu
async function fetchPageData(page) {
  try {
    const response = await fetch(
      `https://www.gamegaraj.com/oem-paketler/page/${page}/`
    );
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
    const totalPagesElement = dom.window.document.querySelector(
      ".woocommerce-pagination .page-numbers li:nth-last-child(2) a"
    );
    return totalPagesElement
      ? parseInt(totalPagesElement.textContent.trim(), 10)
      : 1;
  } catch (error) {
    throw new Error(`Failed to fetch total pages: ${error.message}`);
  }
}

// Ürünleri ayrıştırma fonksiyonu
function parseProducts(doc) {
  const productElements = doc.querySelectorAll(".products li.product");
  return Array.from(productElements).map((product) => {
    const imageElement = product.querySelector(".edgtf-pl-image img");
    const titleElement = product.querySelector(".edgtf-product-list-title a");
    const priceElement = product.querySelector(
      ".price ins .woocommerce-Price-amount"
    );
    const specsElement = product.querySelector(
      'div[itemprop="description"] ul'
    ); // Teknik özelliklerin bulunduğu alan

    // Fiyatı sayıya çevirme
    let priceText = priceElement ? priceElement.textContent.trim() : null;
    let priceNumber = null;

    if (priceText) {
      const normalizedPriceText = priceText
        .replace(/,/g, "")
        .replace(/[^0-9.]/g, "");
      priceNumber = parseFloat(normalizedPriceText);
    }

    // Teknik özellikleri al
    const specsList = specsElement
      ? Array.from(specsElement.querySelectorAll("li")).map((li) =>
          li.textContent.trim()
        )
      : [];

    // Function to find the GPU
    const findGPU = (list) => {
      return (
        list.find(
          (x) =>
            x.toLowerCase().includes("rtx") ||
            x.toLowerCase().includes("gtx") ||
            x.toLowerCase().includes("rx")
        ) || "N/A"
      );
    };

    // Function to find the RAM
    const findRAM = (list) => {
      return (
        list
          .slice()
          .reverse()
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
          .slice()
          .reverse()
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

    // Building the specs object based on the specsList length
    const specs = specsList.reduce((acc, spec, index) => {
      if (index === 0) acc["CPU"] = spec;
      else if (index === 1) acc["Motherboard"] = spec;
      else if (index === 2) acc["GPU"] = findGPU(specsList);
      else if (index === 3) acc["Ram"] = findRAM(specsList);
      else if (index === 4) acc["Storage"] = findStorage(specsList);
      return acc;
    }, {});

    // Handling cases where specsList length is not 5
    if (specsList.length !== 5) {
      if (!specs["Ram"]) specs["Ram"] = findRAM(specsList);
      if (!specs["Storage"]) specs["Storage"] = findStorage(specsList);
    }
    return {
      image: imageElement ? imageElement.getAttribute("src") : null,
      name: titleElement ? titleElement.textContent.trim() : null,
      price: priceNumber,
      link: titleElement ? titleElement.getAttribute("href") : null,
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
