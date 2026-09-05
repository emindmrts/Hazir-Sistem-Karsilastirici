/**
 * productIndex.mjs — server-side product catalogue.
 *
 * Ports of the client logic (kept behaviour-identical on purpose):
 *   - normalise() + parseCpuModel()  ← client/src/hooks/use-products.ts
 *   - createSlug()/shortHash()/assignSlugs()/findBySlug() ← client/src/hooks/use-slugs.ts
 *   - F/P scoring                   ← client/src/lib/fp-scoring.ts
 *
 * Storage layout (the "markalara göre parçalama"):
 *   data/stores/<storeKey>.json  — one file per store, written by the scrapers.
 * Falls back to root mock.json when the partitions directory is absent
 * (e.g. before the first partitioned scrape run).
 *
 * Everything is cached in memory and rebuilt only when the underlying
 * files change (mtime/size fingerprint).
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");
const PARTITIONS_DIR = path.join(ROOT, "data", "stores");
const MOCK_PATH = path.join(ROOT, "mock.json");

// ─── Store key ───────────────────────────────────────────────────────────────
// Same normalisation as createSlug()'s store part: "GamingGen" → "gaminggen",
// "İnceHesap" → "incehesap". Used both for partition file names and for
// matching the sidebar store ids sent by the client.

export function storeKey(store) {
  return String(store ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");
}

// ─── normalise (port of use-products.ts) ─────────────────────────────────────

function parseCpuModel(cpuStr) {
  if (!cpuStr) return "";
  if (/^(n\/a|intel|amd|ryzen|core|i3|i5|i7|i9|ultra)$/i.test(cpuStr.trim())) return "";

  const cleaned = cpuStr
    .replace(/İşlemci/gi, "")
    .replace(/INTEL-/gi, "")
    .replace(/AMD-/gi, "")
    .replace(/Intel/gi, "")
    .replace(/AMD/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned.split(" ");
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].trim().replace(/^i[3579]-/i, "");

        // Skip OEM kodlari (orn. 100-000001406)
        if (/^-?\d+-\d{5,}$/.test(part)) continue;

    // Skip general socket/cooler specs
    if (/ghz|lga|am\d|soket|box|kutulu|kutusuz|tray|fan|mpk/i.test(part)) continue;

    // Skip cache specs (e.g. 16mb, 32mb, önbellek)
    if (/mb|önbellek|onbellek/i.test(part)) continue;

    // Skip nanometer specs (e.g. 3nm, 5nm, 7nm, 10nm, 10nmm)
    if (/nm|nmm/i.test(part)) continue;

    // Skip core/thread specs
    if (/çekirdek|cekirdek|thread|pcie/i.test(part)) continue;

    // Skip storage/SSD specifications that leaked in
    if (/m\.?2|ssd|sata|nvme/i.test(part)) continue;

    // Skip motherboard chipsets (e.g. H610, B760, Z790, A620, X870)
    if (/^[hbzax]\d{3}/i.test(part)) continue;

    // Skip generic hardware words
    if (/anakart|motherboard|ram|gpu|ekran|kartı|karti|ddr/i.test(part)) continue;

    // Skip single/double digit numbers (cores/threads/series fallbacks)
    if (/^\d+$/.test(part) && part.length <= 2) continue;

    // Skip wattages (e.g., 65w, 105w, 120w, 170w)
    if (/^\d+w$/i.test(part)) continue;

    // Skip frequencies/version numbers with decimals/dots (e.g. 3.70, 4.2, 12., 14.)
    if (/\./.test(part)) continue;

    // Skip specific sockets like 1700 or 1851
    if (part === "1700" || part === "1851") continue;

    // Skip generation spec words (e.g. 14.nesil)
    if (/nesil|nesıl/i.test(part)) continue;

    // Skip frequency / memory clocks (e.g. 5600mhz)
    if (/mhz|hz/i.test(part)) continue;

    // Skip generic series names
    if (/^(ryzen|core|i3|i5|i7|i9|ultra|dual)$/i.test(part)) continue;

    if (/\d/.test(part)) {
      return part.toUpperCase();
    }
  }
    const fallback = (parts[parts.length - 1]?.toUpperCase() || "").replace(/^I[3579]-/, "");
    if (/^-?\d+-\d{5,}$/.test(fallback) || fallback === "") return "";
  if (/^(ryzen|core|i3|i5|i7|i9|ultra|dual|n\/a|intel|amd|anakart|motherboard|ram|ssd)$/i.test(fallback)) {
    return "";
  }
  if (/^\d+$/.test(fallback) && fallback.length <= 2) {
    return "";
  }
  if (/\./.test(fallback) || /w$/i.test(fallback) || /nm$/i.test(fallback) || fallback === "1700" || fallback === "1851" || /^[hbzax]\d{3}/i.test(fallback)) {
    return "";
  }
  return fallback;
}

// "N/A" / bos deger yok hukmundedir: arayuzde ham "N/A" metni gorunmez,
// benzer-urun eslesmesine N/A anahtarlar karismaz.
// Ayrica perakendecilerin parca adina ekledigi "(Stokta Yok)" dipnotlari
// ve "PSU Yok" kasa sonekleri temizlenir.
function orUndef(v) {
  if (v == null) return undefined;
  if (typeof v !== "string") return undefined;
  const s = v
    .replace(/\s*\(stokta?\s+(yok|var)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const t = s.toLowerCase();
  if (t === "" || t === "n/a" || t === "yok" || t === "yoktur" || t === "-" || t === "--") return undefined;
  return s;
}

export function normalise(raw) {
  const price = Number(raw.price ?? 0);
  const cpu = raw.specs?.CPU ?? "";
  const gpu = raw.specs?.GPU ?? "";
  const ram = raw.specs?.RAM ?? "";
  const ssd = raw.specs?.SSD ?? "";
  const storage = raw.specs?.Storage ?? "";
  const motherboard = raw.specs?.Motherboard ?? "";
  const pc_case = raw.specs?.Case ?? "";
  const psu = raw.specs?.PSU ?? "";
  const cooler = raw.specs?.Cooler ?? "";

  const cpuLower = cpu.toLowerCase();
  const cpuMarka = cpuLower.includes("intel") || cpuLower.includes("core") || cpuLower.includes("i3") || cpuLower.includes("i5") || cpuLower.includes("i7") || cpuLower.includes("i9")
    ? "Intel"
    : cpuLower.includes("amd") || cpuLower.includes("ryzen") || cpuLower.includes("r3") || cpuLower.includes("r5") || cpuLower.includes("r7")
      ? "AMD"
      : undefined;

  // Model adi: bilinen cip tier'i kullan (farkli yazimlar birlesir:
  // "Ryzen 5 7500F" / "R5 7500F" / "7500F" -> "7500F").
  // Tier bilinmiyorsa eski heuristic'e dus.
  const cpuTierName = getCpuTier(cpu);
  const parsedModel = cpuTierName !== "UNKNOWN" ? cpuTierName : parseCpuModel(cpu);

  // Kasa "PSU Yok" diyorsa PSU satiri "Dahil Degil" olur; kasa adindaki
  // sonek temizlenir (bilgi PSU satirina tasinmis olur).
  let caseVal = orUndef(pc_case);
  let psuVal = orUndef(psu);
  if (!psuVal && /psu\s*yok/i.test(pc_case || "")) psuVal = "Dahil Değil";
  if (caseVal) {
    const stripped = caseVal.replace(/\s*PSU\s*YOK?\s*/gi, " ").replace(/\s+/g, " ").trim();
    if (stripped) caseVal = stripped;
  }

  return {
    ...raw,
    sistemAdi: raw.name ?? "",
    fiyat: price,
    resimUrl: raw.image ?? raw.img ?? "",
    siteUrl: raw.url ?? raw.link ?? "",
    magaza: raw.store ?? "",
    islemci: orUndef(cpu),
    islemciMarka: cpuMarka,
    islemciModel: parsedModel || undefined,
    ekranKarti: orUndef(gpu),
    ram: orUndef(ram),
    ssd: orUndef(ssd),
    gpuKey: (orUndef(gpu) ?? "").split(" ").slice(0, 3).join(" ").toUpperCase(),

    depolama: orUndef(storage),
    anakart: orUndef(motherboard),
    kasa: caseVal,
    psu: psuVal,
    sogutucu: orUndef(cooler),
    stoktaVarMi: raw.store === "pckolik" ? true : price > 0,
  };
}

// ─── Slugs (port of use-slugs.ts) ────────────────────────────────────────────

export function createSlug(name, store) {
  const cleanName = (name || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const cleanStore = storeKey(store);

  return `${cleanStore}-${cleanName}`;
}

export function shortHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 6);
}

function nameOf(p) {
  return p.name || p.sistemAdi || "";
}

function storeOf(p) {
  return p.magaza || p.store || "";
}

function identityOf(p) {
  return p.url || p.siteUrl || `${nameOf(p)}-${storeOf(p)}`;
}

export function assignSlugs(products) {
  const baseCounts = new Map();
  for (const p of products) {
    const base = createSlug(nameOf(p), storeOf(p));
    baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
  }
  for (const p of products) {
    const base = createSlug(nameOf(p), storeOf(p));
    p.slug = (baseCounts.get(base) || 0) > 1
      ? `${base}-${shortHash(identityOf(p))}`
      : base;
  }
  return products;
}

export function findBySlug(products, slug) {
  return products.find((p) => p.slug === slug);
}

// ─── F/P scoring (port of fp-scoring.ts) ─────────────────────────────────────

const gpuScores = {
  "RTX 5090": 450, "RTX 5080": 380, "RTX 5070 TI": 300, "RTX 5070": 250,
  "RX 9070 XT": 260, "RX 9070": 230, "RTX 5060 TI": 180, "RX 9060 XT": 160,
  "RTX 5060": 145, "RX 9060": 130, "RTX 5050": 110, "RTX 4090": 350,
  "RX 7900 XTX": 320, "RTX 4080 SUPER": 280, "RTX 4080": 260, "RX 7900 XT": 250,
  "RTX 4070 TI SUPER": 230, "RTX 4070 TI": 210, "RX 7900 GRE": 200,
  "RTX 4070 SUPER": 190, "RX 7800 XT": 180, "RTX 4070": 170, "RX 6800 XT": 160,
  "RX 7700 XT": 150, "RTX 4060 TI": 130, "RX 6700 XT": 125, "RTX 3060 TI": 115,
  "RTX 4060": 100, "RX 7600 XT": 95, "ARC B580": 95, "RX 7600": 85,
  "RTX 3060": 75, "RX 6600 XT": 75, "ARC A770": 70, "RX 6600": 65,
  "ARC A750": 60, "RTX 3050": 50, "GTX 1660 SUPER": 45, "GTX 1650": 30,
  "RX 580": 45, "GT 730": 8, "UHD 730": 10, "5090": 450,
};

const cpuScores = {
  "9950X3D": 260, "9800X3D": 250, "9900X3D": 240, "285K": 230, "14900K": 250,
  "7950X3D": 240, "7800X3D": 220, "270K": 195, "265KF": 190, "265K": 190,
  "14700K": 200, "13700K": 190, "9700X": 180, "7900X": 180, "14600K": 170,
  "13600K": 160, "7700X": 150, "250KF": 145, "250K": 145, "245KF": 140,
  "245K": 140, "9600X": 140, "7600X": 135, "7600": 130, "7500F": 120,
  "14400F": 115, "225F": 110, "225": 110, "13400F": 110, "12400F": 80,
  "5600X": 80, "5600": 75, "12100F": 60, "5500": 55, "4500": 40,
  "7500X3D": 130, "5700X3D": 150, "5800X3D": 165, "9950X": 210, "9850X3D": 255,
  "5700X": 85, "5700": 78, "12600KF": 105, "12600K": 105, "12700F": 155, "13420H": 85,
  "14700F": 190, "13500": 115, "14400": 115, "14900": 245, "14900F": 245, "9500F": 135,
  "235": 115, "7900": 165, "9600": 135, "8400F": 110, "8700F": 140, "5750G": 65, "3000G": 20,
};

export function getGpuTier(gpuStr) {
  if (!gpuStr) return "UNKNOWN";
  const upper = gpuStr.toUpperCase();
  for (const key of Object.keys(gpuScores).sort((a, b) => b.length - a.length)) {
    const regex = new RegExp(key.replace(/\s+/g, "\\s*"));
    if (regex.test(upper)) return key;
  }
  const rtxMatch = upper.match(/RTX\s*(50[5-9]0|40[6-9]0|30[5-9]0)(?:\s*(TI|SUPER))?/);
  if (rtxMatch) return rtxMatch[0].replace(/\s+/g, " ");
  const gtxMatch = upper.match(/GTX\s*(16[5-6]0|10[5-8]0)(?:\s*(TI|SUPER))?/);
  if (gtxMatch) return gtxMatch[0].replace(/\s+/g, " ");
  const rxMatch = upper.match(/RX\s*(90[6-7]0|7[6-9]00|6[4-9]00)(?:\s*(XT|GRE))?/);
  if (rxMatch) return rxMatch[0].replace(/\s+/g, " ");
  return "UNKNOWN";
}

export function getCpuTier(cpuStr) {
  if (!cpuStr) return "UNKNOWN";
  const upper = cpuStr.toUpperCase();
  for (const key of Object.keys(cpuScores).sort((a, b) => b.length - a.length)) {
    if (upper.includes(key)) return key;
  }
  return "UNKNOWN";
}

function getRamCapacity(ramStr) {
  if (!ramStr) return 16;
  const match = ramStr.toUpperCase().match(/\b(\d{1,3})\s*GB\b/);
  if (match) return parseInt(match[1], 10);
  return 16;
}

function getSsdCapacityTb(ssdStr) {
  if (!ssdStr) return 0.5;
  const upper = ssdStr.toUpperCase();
  if (upper.includes("2TB") || upper.includes("2 TB")) return 2.0;
  if (upper.includes("1TB") || upper.includes("1 TB")) return 1.0;
  if (upper.includes("500GB") || upper.includes("512GB") || upper.includes("480GB")) return 0.5;
  if (upper.includes("250GB") || upper.includes("256GB") || upper.includes("240GB")) return 0.25;
  return 0.5;
}

function getMoboScore(moboStr) {
  if (!moboStr) return 10;
  const upper = moboStr.toUpperCase();
  if (upper.includes("Z890") || upper.includes("X870") || upper.includes("X670") || upper.includes("Z790") || upper.includes("B650E")) return 30;
  if (upper.includes("B650") || upper.includes("B760") || upper.includes("B860") || upper.includes("B850") || upper.includes("X570") || upper.includes("B550")) return 20;
  if (upper.includes("A620") || upper.includes("H610") || upper.includes("H810") || upper.includes("B840") || upper.includes("A520") || upper.includes("B450")) return 10;
  return 12;
}

function getCoolerScore(coolerStr) {
  if (!coolerStr) return 5;
  const upper = coolerStr.toUpperCase();
  if (upper.includes("YOK") || upper.includes("N/A")) return 5;
  if (upper.includes("SIVI") || upper.includes("LIQUID") || upper.includes("WATER") || upper.includes("240") || upper.includes("280") || upper.includes("360")) return 25;
  if (upper.includes("KULE") || upper.includes("TOWER") || upper.includes("BAKIR")) return 12;
  return 7;
}

function getPsuScore(psuStr, caseStr) {
  const combined = ((psuStr || "") + " " + (caseStr || "")).toUpperCase();
  const match = combined.match(/\b(\d{3,4})\s*W\b/);
  if (match) {
    const watts = parseInt(match[1], 10);
    if (watts >= 1000) return 20;
    if (watts >= 850) return 16;
    if (watts >= 750) return 12;
    if (watts >= 650) return 8;
    if (watts >= 500) return 5;
  }
  return 6;
}

function rawFp(p) {
  const gS = gpuScores[getGpuTier(p.ekranKarti)] || 80;
  const cS = cpuScores[getCpuTier(p.islemci)] || 80;
  const rGb = getRamCapacity(p.ram);
  const sTb = getSsdCapacityTb(p.ssd || p.depolama);
  const mS = getMoboScore(p.anakart);
  const cSg = getCoolerScore(p.sogutucu);
  const pS = getPsuScore(p.psu, p.kasa);
  const perf = gS * 1.0 + cS * 0.35 + rGb * 1.5 + sTb * 10 + mS + cSg + pS;
  return (perf / p.fiyat) * 1000;
}

function medianRawFp(products) {
  const list = [];
  for (const p of products) {
    if (p.fiyat > 0 && p.stoktaVarMi) list.push(rawFp(p));
  }
  if (list.length < 5) return null;
  list.sort((a, b) => a - b);
  const mid = Math.floor(list.length / 2);
  return list.length % 2 !== 0 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

export function calculateFPScore(product, allProducts) {
  if (!product.fiyat || product.fiyat <= 0) return 50;
  const median = medianRawFp(allProducts);
  if (median == null) return 70;
  const finalScore = Math.max(30, Math.min(99, Math.round((rawFp(product) / median) * 70)));
  return finalScore;
}

// ─── Filter matchers (shared by filterProducts + facets) ─────────────────────
// Behaviour-identical ports of the useMemo logic in use-products.ts.

export function matchCpuSeries(islemci, seriesList) {
  if (!seriesList?.length) return true;
  if (!islemci) return false;
  const t = islemci.toUpperCase();
  return seriesList.some((s) => {
    const upperS = String(s).toUpperCase();
    if (upperS === "CORE I3") return t.includes("I3");
    if (upperS === "CORE I5") return t.includes("I5");
    if (upperS === "CORE I7") return t.includes("I7");
    if (upperS === "CORE I9") return t.includes("I9");
    if (upperS === "RYZEN 3") return t.includes("RYZEN 3") || t.includes("R3");
    if (upperS === "RYZEN 5") return t.includes("RYZEN 5") || t.includes("R5");
    if (upperS === "RYZEN 7") return t.includes("RYZEN 7") || t.includes("R7");
    if (upperS === "RYZEN 9") return t.includes("RYZEN 9") || t.includes("R9");
    return t.includes(upperS);
  });
}

export function matchGpuBrand(ekranKarti, brands) {
  if (!brands?.length) return true;
  if (!ekranKarti) return false;
  const t = ekranKarti.toUpperCase();
  if (brands.includes("RTX") && t.includes("RTX")) return true;
  if (brands.includes("GTX") && t.includes("GTX")) return true;
  if (brands.includes("RX") && t.includes("RX") && !t.includes("RTX")) return true;
  if (brands.includes("ARC") && t.includes("ARC")) return true;
  return false;
}

// ─── Catalogue loader (partitions + cache) ───────────────────────────────────

let _cache = null; // { fp: string, products: Array }

async function fingerprint() {
  const parts = [];
  try {
    const files = await fs.readdir(PARTITIONS_DIR);
    const jsons = files.filter((f) => f.endsWith(".json")).sort();
    for (const f of jsons) {
      const st = await fs.stat(path.join(PARTITIONS_DIR, f));
      parts.push(`${f}:${st.size}:${st.mtimeMs}`);
    }
  } catch {
    // no partitions dir yet
  }
  try {
    const st = await fs.stat(MOCK_PATH);
    parts.push(`mock.json:${st.size}:${st.mtimeMs}`);
  } catch {
    // no fallback file either
  }
  return parts.join("|");
}

async function readRawProducts() {
  // Prefer per-store partitions …
  try {
    const files = await fs.readdir(PARTITIONS_DIR);
    const jsons = files.filter((f) => f.endsWith(".json")).sort();
    if (jsons.length > 0) {
      const all = [];
      for (const f of jsons) {
        const raw = await fs.readFile(path.join(PARTITIONS_DIR, f), "utf-8");
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) all.push(...arr);
      }
      console.log(`[catalog] Loaded ${all.length} raw products from ${jsons.length} store partitions`);
      return all;
    }
  } catch {
    // fall through to mock.json
  }
  // … fall back to the monolithic file.
  const raw = await fs.readFile(MOCK_PATH, "utf-8");
  const arr = JSON.parse(raw);
  console.log(`[catalog] Loaded ${arr.length} raw products from mock.json (fallback)`);
  return arr;
}

/**
 * Full enriched catalogue: normalised + globally unique slugs + fpScore.
 * Slugs MUST be assigned over the global set (collision counts), so this
 * always loads everything; per-request savings come from filtering +
 * paginating before sending (client downloads ~50KB instead of ~2MB).
 */
export async function loadCatalog() {
  const fp = await fingerprint();
  if (_cache && _cache.fp === fp) return _cache.products;

  const raw = await readRawProducts();
  const products = assignSlugs(raw.map((p) => normalise(p)));
  const median = medianRawFp(products);
  for (const p of products) {
    p.fpScore = median == null ? (p.fiyat > 0 ? 70 : 50) : p.fiyat > 0
      ? Math.max(30, Math.min(99, Math.round((rawFp(p) / median) * 70)))
      : 50;
  }

  _cache = { fp, products };
  console.log(`[catalog] Enriched ${products.length} products (slugs + fpScore)`);
  return products;
}

/** Invalidate the in-memory catalogue (kept for compat with the old watcher). */
export function invalidateCatalog() {
  _cache = null;
}

// ─── Config signature (same-product-different-name matching) ─────────────────
// Groups listings by hardware configuration, independent of retailer naming:
// CPU tier + GPU tier + RAM size/generation + storage size/type + chipset.
// Rows missing any piece return null and always stand alone (no false merges).

function ramKey(s) {
  if (!s) return null;
  const m = String(s).toUpperCase().match(/(\d{1,4})\s*GB/);
  if (!m) return null;
  const ddr =
    String(s).toUpperCase().match(/DDR\s*([45])/)?.[1] ||
    /\bD([45])\b/.exec(String(s).toUpperCase())?.[1] ||
    "?";
  return `${m[1]}-DDR${ddr}`;
}

function storKey(s) {
  if (!s) return null;
  const m = String(s).toUpperCase().match(/(\d+(?:[.,]\d+)?)\s*(TB|GB)/);
  if (!m) return null;
  const gb = m[2] === "TB" ? Math.round(parseFloat(m[1].replace(",", ".")) * 1000) : Number(m[1]);
  const u = String(s).toUpperCase();
  const t = /NVME|M\.?2/.test(u) ? "N" : /SSD/.test(u) ? "S" : /HDD/.test(u) ? "H" : "?";
  return `${gb}${t}`;
}

function chipKey(s) {
  if (!s) return null;
  const m = String(s).toUpperCase().match(/([ABHXZ]\d{3})/);
  return m ? m[1] : null;
}

export function configKey(p) {
  const c = getCpuTier(p.islemci);
  const g = getGpuTier(p.ekranKarti);
  const r = ramKey(p.ram);
  const st = storKey(p.ssd || p.depolama);
  const ch = chipKey(p.anakart);
  if (c === "UNKNOWN" || g === "UNKNOWN" || !r || !st || !ch) return null;
  return `${c}|${g}|${r}|${st}|${ch}`;
}

/**
 * Group normalised products by config signature.
 * Solo items (unique config or incomplete data) become single-offer groups.
 * Offers inside a group are sorted by price ascending.
 */
export function groupByConfig(products) {
  const map = new Map();
  for (const p of products) {
    const key = configKey(p);
    const gkey = key ?? `solo:${p.slug || p.siteUrl || `${p.sistemAdi}::${p.magaza}`}`;
    if (!map.has(gkey)) map.set(gkey, []);
    map.get(gkey).push(p);
  }
  const groups = [];
  for (const [key, offers] of map) {
    offers.sort((a, b) => a.fiyat - b.fiyat);
    const prices = offers.map((o) => o.fiyat).filter((f) => f > 0);
    const stores = [...new Set(offers.map((o) => o.magaza).filter(Boolean))];
    const cheapest = offers[0];
    groups.push({
      key,
      title: cheapest.sistemAdi,
      image: cheapest.resimUrl,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      storeCount: stores.length,
      offerCount: offers.length,
      stores,
      offers,
    });
  }
  return groups;
}
