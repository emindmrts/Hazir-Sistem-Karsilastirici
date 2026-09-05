/**
 * Build-time sitemap generator.
 * Reads public/mock.json, produces an absolute-URL sitemap that includes the
 * homepage plus every product detail page (/sistem/:slug).
 *
 * Run automatically before each build (see package.json "prebuild").
 */
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = resolve(__dirname, "..", "public")
const SITE_URL = "https://www.pckarsilastir.com"

/** Mirrors createSlug() in src/hooks/use-slugs.ts */
function createSlug(name, store) {
  const clean = (s) =>
    (s || "")
      .toLocaleLowerCase("tr-TR")
      .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
      .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")

  const cleanName = clean(name)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

  const cleanStore = clean(store).replace(/[^a-z0-9]/g, "")

  return `${cleanStore}-${cleanName}`
}

/** Mirrors shortHash() in src/hooks/use-slugs.ts */
function shortHash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0
  return h.toString(36).slice(0, 6)
}

/**
 * Mirrors assignSlugs() in src/hooks/use-slugs.ts: unique base slugs stay as-is,
 * colliding ones get a short hash of the store URL appended so distinct listings
 * each get their own URL (and rows sharing the same URL collapse).
 */
function assignSlugs(products) {
  const baseCounts = new Map()
  for (const p of products) {
    const base = createSlug(p?.name, p?.store)
    baseCounts.set(base, (baseCounts.get(base) || 0) + 1)
  }
  const slugs = new Map()
  for (const p of products) {
    const base = createSlug(p?.name, p?.store)
    const identity = p?.url || `${p?.name || ""}-${p?.store || ""}`
    slugs.set(p, baseCounts.get(base) > 1 ? `${base}-${shortHash(identity)}` : base)
  }
  return slugs
}

function xmlEscape(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function main() {
  const today = new Date().toISOString().split("T")[0]

  let products = []
  try {
    products = JSON.parse(readFileSync(resolve(PUBLIC_DIR, "mock.json"), "utf-8"))
  } catch (err) {
    console.warn("[sitemap] mock.json okunamadı, sadece ana sayfa eklenecek:", err.message)
  }

  const urls = [
    { loc: `${SITE_URL}/`, changefreq: "daily", priority: "1.0", lastmod: today },
    // /karsilastir bilinçli olarak listede YOK: özellik localhost-gated,
    // yayına alınırken geri eklenecek.
  ]

  const slugs = assignSlugs(products)
  const seen = new Set()
  for (const p of products) {
    if (!p?.name || !p?.store) continue
    const slug = slugs.get(p)
    if (!slug || slug === "-" || seen.has(slug)) continue
    seen.add(slug)
    // Ürün URL'lerinde lastmod YOK: elimizde ürün-bazlı güncellenme tarihi
    // olmadığı için build tarihini yazmak Google'a sahte tazelik sinyali verir.
    urls.push({
      loc: `${SITE_URL}/sistem/${slug}`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: null,
    })
  }

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ""}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

  writeFileSync(resolve(PUBLIC_DIR, "sitemap.xml"), xml, "utf-8")
  console.log(`[sitemap] ${urls.length} URL yazıldı -> public/sitemap.xml`)
}

main()
