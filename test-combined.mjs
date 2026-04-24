import { runCombined } from "./routes/combined.mjs";

async function test() {
  console.log("Starting test...");
  try {
    const products = await runCombined();
    console.log(`Total products scraped: ${products?.length || 0}`);
    if (products && products.length > 0) {
      console.log("Sample product:", products[0]);
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
