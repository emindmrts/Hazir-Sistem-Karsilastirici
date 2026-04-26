import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOCK_PATH = path.join(__dirname, "..", "mock.json");

async function check() {
    const data = JSON.parse(await fs.readFile(MOCK_PATH, "utf-8"));
    const itopya = data.filter(p => p.store === "itopya");
    console.log(`Found ${itopya.length} Itopya products.`);
    if (itopya.length > 0) {
        console.log("Sample link:", itopya[0].link);
    }
}

check();
