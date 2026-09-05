/**
 * priceHistory.mjs — per-day price snapshots for the detail-page badge.
 *
 * Every catalogue rebuild (triggered by the nightly scrape) records the
 * current price of every product under today's date key. The client uses
 * this to show a "X günde -Y₺" drop badge and a mini sparkline.
 *
 * Storage layout ("price-history.json", gitignored):
 *   {
 *     "2026-09-05": { "<slug>": <price>, ... },
 *     ...
 *   }
 *
 * The file is capped at HISTORY_DAYS so it stays bounded (~1MB scale).
 * Reads go through an in-memory cache keyed on the file fingerprint.
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");
const HISTORY_PATH = path.join(ROOT, "price-history.json");

export const HISTORY_DAYS = 90;
export const CHART_POINTS = 30;

let _history = null; // { fp: string, map: Map<slug, [{date, price}]> }

function todayKey() {
  // Türkiye saatine yakın bir gün anahtarı için UTC+3'e kaydır.
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function dayKeyOffset(offset) {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000 - offset * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

async function fingerprint() {
  try {
    const st = await fs.stat(HISTORY_PATH);
    return `${st.size}:${st.mtimeMs}`;
  } catch {
    return "missing";
  }
}

async function loadRaw() {
  try {
    const raw = await fs.readFile(HISTORY_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Build a slug → [{ date, price }] map (sorted by date), capped at the
 * last CHART_POINTS entries per slug.
 */
async function loadHistory() {
  const fp = await fingerprint();
  if (_history && _history.fp === fp) return _history.map;

  const raw = await loadRaw();
  const map = new Map();
  const dates = Object.keys(raw).sort();

  for (const date of dates) {
    const day = raw[date] ?? {};
    for (const [slug, price] of Object.entries(day)) {
      if (typeof price !== "number" || !Number.isFinite(price)) continue;
      let arr = map.get(slug);
      if (!arr) {
        arr = [];
        map.set(slug, arr);
      }
      arr.push({ date, price });
    }
  }

  for (const arr of map.values()) {
    if (arr.length > CHART_POINTS) arr.splice(0, arr.length - CHART_POINTS);
  }

  _history = { fp, map };
  return map;
}

export function invalidatePriceHistory() {
  _history = null;
}

/**
 * Called on every catalogue rebuild: persist today's snapshot.
 * Writes atomically (`.tmp` + rename); prunes to HISTORY_DAYS.
 */
export async function recordPrices(products) {
  try {
    const key = todayKey();
    const raw = await loadRaw();

    const day = raw[key] ?? {};
    for (const p of products) {
      if (!p.slug) continue;
      const price = Number(p.fiyat);
      if (Number.isFinite(price) && price > 0) day[p.slug] = price;
    }
    raw[key] = day;

    // Prune old days
    const dates = Object.keys(raw).sort();
    const cutoff = dayKeyOffset(HISTORY_DAYS);
    for (const date of dates) {
      if (date < cutoff) delete raw[date];
    }

    const tmpPath = `${HISTORY_PATH}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(raw), "utf-8");
    await fs.rename(tmpPath, HISTORY_PATH);
    _history = null; // force reload on next access
    console.log(`[priceHistory] Snapshot ${key} written (${Object.keys(day).length} products)`);
  } catch (err) {
    console.error("[priceHistory] recordPrices error:", err.message);
  }
}

/**
 * Series for a single slug, most-recent-first, plus 7d/30d change deltas.
 * Returns null when there isn't enough history.
 */
export async function getPriceHistory(slug) {
  const map = await loadHistory();
  const arr = map.get(slug);
  if (!arr || arr.length < 2) return null;

  const dates = arr.map((e) => e.date).slice().reverse();
  const prices = arr.map((e) => e.price).slice().reverse();
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  const pctChange = (nDays) => {
    if (arr.length < nDays + 1) return null;
    const old = arr[arr.length - 1 - nDays].price;
    if (old <= 0) return null;
    return Math.round(((prices[0] - old) / old) * 1000) / 10;
  };

  return {
    dates,
    prices,
    min,
    max,
    change7dPct: pctChange(7),
    change30dPct: pctChange(30),
  };
}

/** Lightweight 7-day change used to badge product cards. */
export async function getChange7dPct(slug) {
  const map = await loadHistory();
  const arr = map.get(slug);
  if (!arr || arr.length < 8) return null;
  const old = arr[arr.length - 8].price;
  const cur = arr[arr.length - 1].price;
  if (old <= 0 || !Number.isFinite(cur)) return null;
  return Math.round(((cur - old) / old) * 1000) / 10;
}

/** Current catalog → slug ids, available after the data refresher runs. */
export async function refreshChange7d(products) {
  const map = await loadHistory();
  const out = new Map();
  for (const p of products) {
    if (!p.slug) continue;
    const arr = map.get(p.slug);
    if (!arr || arr.length < 8) continue;
    const old = arr[arr.length - 8].price;
    const cur = arr[arr.length - 1].price;
    if (old > 0 && Number.isFinite(cur)) {
      out.set(p.slug, Math.round(((cur - old) / old) * 1000) / 10);
    }
  }
  return out;
}