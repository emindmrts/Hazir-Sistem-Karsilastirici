import { scrapeAllPages } from "../routes/itopya.mjs";

async function test() {
    console.log("Starting Itopya scraper test...");
    try {
        const products = await scrapeAllPages();
        console.log(`Successfully scraped ${products.length} products.`);
        if (products.length > 0) {
            console.log("First product sample:", JSON.stringify(products[0], null, 2));
        }
    } catch (error) {
        console.error("Scraper failed:", error);
    }
}

test();
