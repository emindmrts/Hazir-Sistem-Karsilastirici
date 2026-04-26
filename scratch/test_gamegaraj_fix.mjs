import { scrapeAllPages } from "../routes/gameGaraj.mjs";

async function test() {
    console.log("Starting GameGaraj scrape test...");
    try {
        const products = await scrapeAllPages();
        console.log(`Successfully scraped ${products.length} products.`);
        if (products.length > 0) {
            console.log("First product sample:", JSON.stringify(products[0], null, 2));
        }
    } catch (e) {
        console.error("Scrape failed:", e);
    }
}

test();
