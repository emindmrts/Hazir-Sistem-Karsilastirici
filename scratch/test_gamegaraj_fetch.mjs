import fetch from "node-fetch";
import { JSDOM } from "jsdom";

async function testFetch() {
    console.log("Testing fetch for GameGaraj...");
    try {
        const response = await fetch("https://www.gamegaraj.com/oem-paketler/");
        const text = await response.text();
        const dom = new JSDOM(text);
        const doc = dom.window.document;
        
        const productName = doc.querySelector("a.text-xl.font-semibold.text-gray-900");
        const price = doc.querySelector("p.text-3xl.font-extrabold");
        const paginationLinks = Array.from(doc.querySelectorAll("a.products-pagination"));
        const pages = paginationLinks.map(a => a.textContent.trim()).filter(t => !isNaN(t)).map(Number);
        const maxPage = pages.length > 0 ? Math.max(...pages) : 1;
        
        console.log("Fetch Result:", {
            hasProductName: !!productName,
            productName: productName?.textContent.trim(),
            hasPrice: !!price,
            priceText: price?.textContent.trim(),
            maxPage,
            paginationHTML: doc.querySelector("nav")?.innerHTML || "N/A"
        });
        
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testFetch();
