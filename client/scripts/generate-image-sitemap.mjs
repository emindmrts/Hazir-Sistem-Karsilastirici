/**
 * Build-time image sitemap generator.
 * Reads public/mock.json and produces an image sitemap that includes
 * every product's image, helping Google Images discover and index them.
 *
 * Run automatically before each build (see client/package.json "prebuild").
 */
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = resolve(__dirname, "..", "public")
const SITE_URL = "https://www.pckarsilastir.com"

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

function shortHash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0
  return h.toString(36).slice(0, 6)
}

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
  return String(str || "")
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
    console.warn("[image-sitemap] mock.json okunamadı:", err.message)
    return
  }

  const slugs = assignSlugs(products)
  const seen = new Set()
  const entries = []

  for (const p of products) {
    if (!p?.name || !p?.store || !p?.image) continue
    const slug = slugs.get(p)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)

    entries.push(`  <url>
    <loc>${xmlEscape(`${SITE_URL}/sistem/${slug}`)}</loc>
    <lastmod>${today}</lastmod>
    <image:image>
      <image:loc>${xmlEscape(p.image)}</image:loc>
      <image:title>${xmlEscape(p.name)}</image:title>
      <image:caption>${xmlEscape(`${p.name} — ${p.store} — hazır sistem bilgisayarı`)}</image:caption>
    </image:image>
  </url>`)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join("\n")}
</urlset>
`

  writeFileSync(resolve(PUBLIC_DIR, "sitemap-images.xml"), xml, "utf-8")
  console.log(`[image-sitemap] ${entries.length} görsel → public/sitemap-images.xml`)
}

main()
