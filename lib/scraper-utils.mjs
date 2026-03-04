/**
 * Shared scraper utilities — used by all store scrapers.
 */

import puppeteer from "puppeteer";
import fetch from "node-fetch";


// ─── Price parser ────────────────────────────────────────────────────────────

/**
 * Parses a Turkish-formatted price string into a float.
 * "1.234,56 TL" → 1234.56
 */
export function parsePrice(text = "") {
    const clean = text
        .replace(/[^\d,.]/g, "")   // keep only digits, dot, comma
        .replace(/\.(?=\d{3})/g, "") // remove thousands dot
        .replace(",", ".");          // decimal comma → dot
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
}

// ─── Puppeteer factory ───────────────────────────────────────────────────────

/** Launches a headless Chromium browser with common flags. */
export async function launchBrowser() {
    return puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
        ],
    });
}

// ─── HTTP fetch with timeout + retry ────────────────────────────────────────

/**
 * Fetches a URL and returns the response text.
 * Retries up to `retries` times on failure.
 */
export async function fetchHtml(url, { timeoutMs = 30_000, retries = 3, headers = {} } = {}) {
    const defaultHeaders = {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8",
        ...headers,
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { signal: controller.signal, headers: defaultHeaders });
            clearTimeout(timer);
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            return await res.text();
        } catch (err) {
            clearTimeout(timer);
            if (attempt === retries) throw err;
            const wait = attempt * 1500;
            console.warn(`[fetchHtml] Attempt ${attempt} failed for ${url}: ${err.message}. Retrying in ${wait}ms…`);
            await sleep(wait);
        }
    }
}

// ─── Sleep ───────────────────────────────────────────────────────────────────

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Data normaliser ─────────────────────────────────────────────────────────

/**
 * Ensures every product has a consistent schema.
 * Accepts both `url` and `link` (legacy) field names.
 */
export function normalise(raw, store) {
    return {
        name: raw.name ?? raw.title ?? "",
        price: typeof raw.price === "number" ? raw.price : parsePrice(String(raw.price ?? 0)),
        image: raw.image ?? raw.img ?? null,
        url: raw.url ?? raw.link ?? "",
        store: store ?? raw.store ?? "unknown",
        specs: {
            CPU: raw.specs?.CPU ?? raw.specs?.İşlemci ?? null,
            GPU: raw.specs?.GPU ?? raw.specs?.["Ekran Kartı"] ?? null,
            RAM: raw.specs?.RAM ?? raw.specs?.Ram ?? null,
            SSD: raw.specs?.SSD ?? raw.specs?.Storage ?? raw.specs?.Depolama ?? null,
            Motherboard: raw.specs?.Motherboard ?? raw.specs?.Anakart ?? null,
        },
    };
}

// ─── Batch concurrency helper ────────────────────────────────────────────────

/**
 * Runs an async function over an array in batches of `batchSize`.
 * Useful for Puppeteer scraping without opening hundreds of tabs.
 */
export async function batchMap(items, fn, batchSize = 5) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const settled = await Promise.allSettled(batch.map(fn));
        for (const s of settled) {
            if (s.status === "fulfilled" && s.value != null) results.push(s.value);
        }
    }
    return results;
}
