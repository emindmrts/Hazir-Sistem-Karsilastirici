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
      .toLowerCase()
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
  ]

  const seen = new Set()
  for (const p of products) {
    const name = p?.name
    const store = p?.store
    if (!name || !store) continue
    const slug = createSlug(name, store)
    if (!slug || slug === "-" || seen.has(slug)) continue
    seen.add(slug)
    urls.push({
      loc: `${SITE_URL}/sistem/${slug}`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: today,
    })
  }

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

  writeFileSync(resolve(PUBLIC_DIR, "sitemap.xml"), xml, "utf-8")
  console.log(`[sitemap] ${urls.length} URL yazıldı -> public/sitemap.xml`)
}

main()
