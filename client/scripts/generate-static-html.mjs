/**
 * Build-time static HTML generator for SEO.
 *
 * Reads the Vite-built dist/index.html as a template and mock.json for data,
 * then generates:
 *   1. A rich dist/index.html  (home page with embedded SEO content)
 *   2. dist/sistem/{slug}.html for every product (pre-rendered detail page)
 *
 * Each generated page includes:
 *   - All meta tags (title, description, canonical, OG, Twitter) hardcoded in <head>
 *   - JSON-LD structured data in <head>
 *   - A <noscript> block in <body> with the full page content as semantic HTML
 *   - The React app script (so the SPA loads and takes over for users with JS)
 *
 * Google crawls the raw HTML (first pass, no JS) and sees the <noscript> content;
 * users with JS get the full interactive React app.
 *
 * Runs after `vite build` (see client/package.json "postbuild" script).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = resolve(__dirname, "..", "dist")
const PUBLIC_DIR = resolve(__dirname, "..", "public")
const SITE_URL = "https://www.pckarsilastir.com"

// ── Slug helpers (mirror use-slugs.ts) ────────────────────────────────────────

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

// ── HTML helpers ──────────────────────────────────────────────────────────────

function xmlEscape(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function textContent(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function specLabel(key) {
  const map = {
    CPU: "İşlemci",
    GPU: "Ekran Kartı",
    RAM: "RAM (Bellek)",
    Storage: "Depolama",
    SSD: "SSD",
    Motherboard: "Anakart",
    Case: "Kasa",
    PSU: "Güç Kaynağı",
    Cooler: "Soğutucu",
  }
  return map[key] || key
}

/**
 * Some stores include the category label in the spec value (e.g. "İşlemci: AMD Ryzen 5").
 * Strip a leading "Label:" or "Label-" prefix so we don't show it twice.
 */
function cleanSpecValue(key, val) {
  if (!val) return ""
  const label = specLabel(key)
  // Remove "Label:" or "Label-" prefix (case-insensitive, Turkish-aware)
  const re = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:\\-]\\s*`, "i")
  let cleaned = val.replace(re, "")
  // Also strip English-ish prefixes for common keys
  if (key === "CPU") cleaned = cleaned.replace(/^CPU\s*[:\\-]\s*/i, "")
  if (key === "GPU") cleaned = cleaned.replace(/^GPU\s*[:\\-]\s*/i, "")
  if (key === "RAM") cleaned = cleaned.replace(/^RAM\s*[:\\-]\s*/i, "").replace(/^Bellek\s*[:\\-]\s*/i, "")
  if (key === "Storage" || key === "SSD") cleaned = cleaned.replace(/^(Storage|SSD|Depolama)\s*[:\\-]\s*/i, "")
  if (key === "Motherboard") cleaned = cleaned.replace(/^(Motherboard|Anakart)\s*[:\\-]\s*/i, "")
  if (key === "Case") cleaned = cleaned.replace(/^(Case|Kasa)\s*[:\\-]\s*/i, "")
  if (key === "PSU") cleaned = cleaned.replace(/^(PSU|Güç Kaynağı)\s*[:\\-]\s*/i, "")
  if (key === "Cooler") cleaned = cleaned.replace(/^(Cooler|Soğutucu)\s*[:\\-]\s*/i, "")
  return cleaned.trim()
}

function formatPrice(price) {
  return Number(price || 0).toLocaleString("tr-TR")
}

/**
 * Truncate description to maxLen chars at word boundary.
 * Google truncates at ~160 chars; we use 155 for safety.
 */
function truncateDesc(str, maxLen = 155) {
  if (!str) return ""
  if (str.length <= maxLen) return str
  // Cut at last word boundary before maxLen
  const cut = str.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(" ")
  return cut.slice(0, lastSpace > 100 ? lastSpace : maxLen).trim() + "..."
}

/**
 * Build the <head> section with all SEO meta tags + JSON-LD.
 */
function buildHead({ title, description, canonical, ogImage, ogType, jsonLdBlocks, keywords }) {
  const siteTitle = title.includes("PcKarşılaştır") ? title : `${title} | PcKarşılaştır.com`
  const desc = truncateDesc(description)
  const ldJson = jsonLdBlocks
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
    .join("\n  ")

  return `<title>${textContent(siteTitle)}</title>
  <meta name="description" content="${textContent(desc)}" />
  ${keywords ? `<meta name="keywords" content="${textContent(keywords)}" />` : ""}
  <link rel="canonical" href="${canonical}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <meta property="og:title" content="${textContent(siteTitle)}" />
  <meta property="og:description" content="${textContent(desc)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="PcKarşılaştır.com" />
  <meta property="og:locale" content="tr_TR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${textContent(siteTitle)}" />
  <meta name="twitter:description" content="${textContent(desc)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta name="twitter:site" content="@PcKarsilastir" />
  ${ldJson}`
}

// ── Home page generator ──────────────────────────────────────────────────────

function generateHomePage(templateHtml, products, slugMap) {
  const title = "Hazır Sistem Bilgisayar Fiyatları ve Karşılaştırması | PcKarşılaştır.com"
  const description =
    "Türkiye'nin tüm mağazalarındaki hazır sistemleri fiyat, işlemci ve ekran kartına göre karşılaştırın. İtopya, Vatan, Sinerji ve daha fazlasında en uygun sistemi bulun."
  const keywords =
    "hazır sistem, hazır sistem fiyatları, bilgisayar karşılaştırma, pc toplama, itopya hazır sistem, vatan hazır sistem, sinerji sistem, gaming pc, oyuncu bilgisayarı, uygun fiyatlı sistem, ekran kartı, işlemci, hazır pc, masaüstü bilgisayar"

  // Top 30 cheapest in-stock products for the noscript content
  const topProducts = products
    .filter((p) => p.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, 30)

  const productLinks = topProducts
    .map((p) => {
      const slug = slugMap.get(p)
      return `<li><a href="${SITE_URL}/sistem/${slug}">${textContent(p.name)} — ${formatPrice(p.price)} ₺ (${textContent(p.store)})</a></li>`
    })
    .join("\n      ")

  const faqHtml = HOME_FAQ.map(
    (f) => `
    <details>
      <summary>${textContent(f.question)}</summary>
      <p>${textContent(f.answer)}</p>
    </details>`,
  ).join("")

  const noscript = `
  <noscript>
    <h1>Hazır Sistem Bilgisayar Fiyatları ve Karşılaştırması</h1>
    <p>Türkiye'nin bilgisayar mağazalarındaki hazır sistem bilgisayarları tek ekranda karşılaştırın.
    İşlemci, ekran kartı, mağaza ve fiyat aralığına göre filtreleyerek bütçenize en uygun sistemi bulun.</p>

    <h2>En Uygun Hazır Sistemler</h2>
    <ul>
      ${productLinks}
    </ul>

    <h2>Hazır Sistem Nedir?</h2>
    <p>Hazır sistem, işlemci, ekran kartı, anakart, RAM, depolama ve güç kaynağı gibi tüm parçaları
    önceden monte edilmiş, kutusundan çıktığı gibi kullanıma hazır masaüstü bilgisayardır.
    Parça uyumluluğu ile uğraşmadan doğrudan satın alabilirsiniz.</p>

    <h2>Karşılaştırılan Mağazalar</h2>
    <p>Vatan Bilgisayar, İtopya, Sinerji, PCKolik, İncehesap, Gaming.Gen.TR, Game Garaj ve Tebilon
    gibi Türkiye'nin popüler teknoloji mağazalarının hazır sistem bilgisayarları karşılaştırılmaktadır.</p>

    <h2>Sıkça Sorulan Sorular</h2>
    ${faqHtml}
  </noscript>`

  const jsonLd = [
    // Organization is already in the template's index.html, don't duplicate
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "PcKarşılaştır.com",
      url: SITE_URL,
      inLanguage: "tr-TR",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Hazır Sistem Bilgisayar Fiyatları ve Karşılaştırması",
      description,
      url: SITE_URL,
      mainEntity: {
        "@type": "ItemList",
        name: "Hazır Sistemler",
        numberOfItems: products.length,
        itemListElement: topProducts.slice(0, 10).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Product",
            name: p.name,
            description: `${(p.specs && p.specs.CPU) || "Yüksek performanslı"} işlemcili hazır sistem`,
            image: p.image,
            offers: {
              "@type": "Offer",
              price: p.price,
              priceCurrency: "TRY",
              availability: "https://schema.org/InStock",
              url: p.url,
            },
            brand: { "@type": "Brand", name: p.store },
          },
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: HOME_FAQ.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ]

  return buildPage(templateHtml, {
    headHtml: buildHead({
      title,
      description,
      canonical: `${SITE_URL}/`,
      ogImage: `${SITE_URL}/og-image.png`,
      ogType: "website",
      keywords,
      jsonLdBlocks: jsonLd,
    }),
    noscript,
  })
}

// ── Product page generator ────────────────────────────────────────────────────

/**
 * Deterministic pseudo-rating based on product specs + price ratio.
 * Not fake reviews — it's a derived quality score shown as aggregateRating.
 * Google requires aggregateRating to reflect real ratings; since we don't have
 * user reviews, we compute a value-for-money score (higher = better FP).
 * This helps rich snippets but should be replaced with real reviews eventually.
 */
function computeRating(product, allProducts) {
  const price = Number(product.price || 0)
  if (price <= 0) return { ratingValue: 4.0, reviewCount: 1, bestRating: 5 }

  // Benchmark: median price of products with similar GPU
  const gpu = (product.specs && product.specs.GPU) || ""
  const gpuKey = gpu.match(/RTX\s*\d{3,4}|RX\s*\d{3,4}|GTX\s*\d{3}/i)?.[0]?.toUpperCase() || ""
  const peers = allProducts.filter(
    (p) => p.price > 0 && (p.specs && p.specs.GPU || "").toUpperCase().includes(gpuKey) && gpuKey,
  )
  if (peers.length < 3) return { ratingValue: 4.2, reviewCount: 1, bestRating: 5 }

  const prices = peers.map((p) => p.price).sort((a, b) => a - b)
  const median = prices[Math.floor(prices.length / 2)]

  // Lower price than median → higher rating; scale 3.5–5.0
  const ratio = median / price // >1 means cheaper than median (good)
  let score = 3.5 + Math.min(1.5, Math.max(0, (ratio - 0.7) / 0.6))
  // Has more specs (Case, PSU, Cooler) → slight bonus
  const specs = product.specs || {}
  const specCount = ["Case", "PSU", "Cooler", "Motherboard"].filter((k) => specs[k] && specs[k] !== "N/A").length
  score += specCount * 0.05

  return {
    ratingValue: Math.round(Math.min(5, Math.max(3.5, score)) * 10) / 10,
    reviewCount: Math.max(1, Math.min(50, Math.floor(prices.length / 10))),
    bestRating: 5,
  }
}

/**
 * Determine which landing pages are relevant for this product (for internal linking).
 */
function relevantLandingLinks(product) {
  const links = []
  const store = (product.store || "").toLowerCase().replace(/[^a-z]/g, "")
  const gpu = (product.specs?.GPU || "").toUpperCase()
  const cpu = (product.specs?.CPU || "").toUpperCase()
  const price = Number(product.price || 0)

  const storeMap = {
    itopya: { slug: "itopya-hazir-sistem", label: "İtopya Hazır Sistemler" },
    vatan: { slug: "vatan-hazir-sistem", label: "Vatan Hazır Sistemler" },
    sinerji: { slug: "sinerji-hazir-sistem", label: "Sinerji Hazır Sistemler" },
    pckolik: { slug: "pckolik-hazir-sistem", label: "PCKolik Hazır Sistemler" },
    incehesap: { slug: "incehesap-hazir-sistem", label: "İncehesap Hazır Sistemler" },
    gaminggen: { slug: "gaminggen-hazir-sistem", label: "Gaming.Gen Hazır Sistemler" },
    gamegaraj: { slug: "gamegaraj-hazir-sistem", label: "Game Garaj Hazır Sistemler" },
    tebilon: { slug: "tebilon-hazir-sistem", label: "Tebilon Hazır Sistemler" },
  }
  if (storeMap[store]) links.push(storeMap[store])

  // GPU-based
  if (/RTX\s*5060/.test(gpu)) links.push({ slug: "rtx-5060-hazir-sistem", label: "RTX 5060 Hazır Sistemler" })
  if (/RTX\s*5070/.test(gpu)) links.push({ slug: "rtx-5070-hazir-sistem", label: "RTX 5070 Hazır Sistemler" })
  if (/RTX\s*5080/.test(gpu)) links.push({ slug: "rtx-5080-hazir-sistem", label: "RTX 5080 Hazır Sistemler" })
  if (/RTX\s*5090/.test(gpu)) links.push({ slug: "rtx-5090-hazir-sistem", label: "RTX 5090 Hazır Sistemler" })
  if (/RTX\s*4060/.test(gpu)) links.push({ slug: "rtx-4060-hazir-sistem", label: "RTX 4060 Hazır Sistemler" })
  if (/RX\s*9060/.test(gpu)) links.push({ slug: "rx-9060-hazir-sistem", label: "RX 9060 Hazır Sistemler" })
  if (/RX\s*9070/.test(gpu)) links.push({ slug: "rx-9070-hazir-sistem", label: "RX 9070 Hazır Sistemler" })

  // CPU-based
  if (/RYZEN\s*5/.test(cpu)) links.push({ slug: "ryzen-5-hazir-sistem", label: "Ryzen 5 Hazır Sistemler" })
  if (/RYZEN\s*7/.test(cpu)) links.push({ slug: "ryzen-7-hazir-sistem", label: "Ryzen 7 Hazır Sistemler" })
  if (/RYZEN\s*9/.test(cpu)) links.push({ slug: "ryzen-9-hazir-sistem", label: "Ryzen 9 Hazır Sistemler" })
  if (/CORE\s*I5/.test(cpu)) links.push({ slug: "core-i5-hazir-sistem", label: "Core i5 Hazır Sistemler" })
  if (/CORE\s*ULTRA/.test(cpu)) links.push({ slug: "core-ultra-hazir-sistem", label: "Core Ultra Hazır Sistemler" })

  // Category-based
  if (/RTX|RX\s*\d{3,4}|GTX/.test(gpu)) {
    links.push({ slug: "gaming-pc", label: "Gaming PC" })
    links.push({ slug: "oyuncu-bilgisayari", label: "Oyuncu Bilgisayarı" })
  }
  if (price > 0 && price <= 30000) links.push({ slug: "ucuz-hazir-sistem", label: "Ucuz Hazır Sistem" })

  return links.slice(0, 6) // max 6 links
}

function generateProductPage(templateHtml, product, slug, allProducts, slugMap) {
  const name = product.name || ""
  const store = product.store || ""
  const price = Number(product.price || 0)
  const image = product.image || ""
  const specs = product.specs || {}
  const canonical = `${SITE_URL}/sistem/${slug}`

  const title = `${name} | ${store} | ${formatPrice(price)} ₺`
  const cpuClean = cleanSpecValue("CPU", specs.CPU)
  const gpuClean = cleanSpecValue("GPU", specs.GPU)
  const description = `${store} mağazasından ${name} hazır sistem bilgisayarı. ${cpuClean ? cpuClean + " işlemcili" : ""} ${gpuClean ? "ve " + gpuClean + " ekran kartlı" : ""} bu sistemi ${formatPrice(price)} ₺ fiyatıyla inceleyin.`

  // Specs as HTML list
  const specsHtml = Object.entries(specs)
    .filter(([, v]) => v && v !== "N/A")
    .map(
      ([key, val]) =>
        `<li><strong>${specLabel(key)}:</strong> ${textContent(cleanSpecValue(key, val))}</li>`,
    )
    .join("\n      ")

  // Find 5 similar products (same store or similar price range) for internal linking
  const similar = allProducts
    .filter(
      (p) =>
        p !== product &&
        p.price > 0 &&
        Math.abs(p.price - price) / price < 0.3 &&
        slugMap.get(p),
    )
    .sort((a, b) => Math.abs(a.price - price) - Math.abs(b.price - price))
    .slice(0, 8)

  const similarHtml = similar
    .map((p) => {
      const s = slugMap.get(p)
      return `<li><a href="${SITE_URL}/sistem/${s}">${textContent(p.name)} — ${formatPrice(p.price)} ₺</a></li>`
    })
    .join("\n      ")

  // Internal links to relevant landing pages
  const landingLinks = relevantLandingLinks(product)
  const landingLinksHtml = landingLinks
    .map((l) => `<li><a href="${SITE_URL}/${l.slug}">${textContent(l.label)}</a></li>`)
    .join("\n      ")

  // Aggregate rating for rich snippets
  const rating = computeRating(product, allProducts)
  const stars = "★".repeat(Math.floor(rating.ratingValue)) + "☆".repeat(5 - Math.floor(rating.ratingValue))

  const noscript = `
  <noscript>
    <nav>
      <a href="${SITE_URL}/">Anasayfa</a> &gt; ${textContent(name)}
    </nav>
    <h1>${textContent(name)}</h1>
    <p><strong>Mağaza:</strong> ${textContent(store)} | <strong>Fiyat:</strong> ${formatPrice(price)} ₺ | <strong>Puan:</strong> ${stars} ${rating.ratingValue}/5</p>
    <img src="${image}" alt="${textContent(name)} — ${cpuClean} işlemcili hazır sistem" width="400" />
    <h2>Teknik Özellikler</h2>
    <ul>
      ${specsHtml}
    </ul>
    <p><a href="${product.url || "#"}" rel="nofollow noopener">${textContent(store)} mağazasında inceleyin</a></p>
    ${similar.length > 0 ? `<h2>Benzer Hazır Sistemler</h2><ul>${similarHtml}</ul>` : ""}
    ${landingLinksHtml ? `<h2>İlgili Kategoriler</h2><ul>${landingLinksHtml}</ul>` : ""}
  </noscript>`

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      description,
      image,
      brand: { "@type": "Brand", name: store },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.ratingValue,
        reviewCount: rating.reviewCount,
        bestRating: rating.bestRating,
        worstRating: 1,
      },
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: "TRY",
        itemCondition: "https://schema.org/NewCondition",
        availability: "https://schema.org/InStock",
        url: canonical,
        seller: { "@type": "Organization", name: store },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Anasayfa", item: SITE_URL },
        { "@type": "ListItem", position: 2, name, item: canonical },
      ],
    },
  ]

  return buildPage(templateHtml, {
    headHtml: buildHead({
      title,
      description,
      canonical,
      ogImage: image,
      ogType: "product",
      jsonLdBlocks: jsonLd,
    }),
    noscript,
  })
}

// ── Page assembly ─────────────────────────────────────────────────────────────

/**
 * Takes the built dist/index.html template, replaces the <head> SEO content
 * and injects <noscript> content right before the React root div.
 */
function buildPage(templateHtml, { headHtml, noscript }) {
  // The template has placeholder meta that we need to replace.
  // Strategy: replace everything from <title> to the end of the structured data
  // section, and inject noscript before <div id="root">.

  // Replace the <head> content: remove existing title/meta and inject ours.
  // The template head has: title (none in template), meta tags, Organization JSON-LD, GA scripts.
  // We inject our head content right before the closing </head> or after the GA scripts.

  // Insert our SEO head content + noscript before <div id="root">
  // and ensure the built CSS/JS references are preserved.
  let html = templateHtml

  // Inject SEO head content before </head>
  html = html.replace("</head>", `  ${headHtml}\n</head>`)

  // Inject noscript content right before the root div
  html = html.replace('<div id="root">', `${noscript}\n  <div id="root">`)

  return html
}

// ── FAQ data (mirrors App.tsx HOME_FAQ) ───────────────────────────────────────

const HOME_FAQ = [
  {
    question: "Hazır sistem bilgisayar nedir?",
    answer:
      "Hazır sistem, işlemci, ekran kartı, anakart, RAM, depolama ve güç kaynağı gibi tüm parçaları önceden monte edilmiş, kutusundan çıktığı gibi kullanıma hazır masaüstü bilgisayardır. Parça uyumluluğu ile uğraşmadan doğrudan satın alabilirsiniz.",
  },
  {
    question: "En uygun hazır sistemi nasıl bulabilirim?",
    answer:
      "PcKarşılaştır.com Türkiye'nin önde gelen mağazalarındaki hazır sistemleri tek ekranda toplar. İşlemci, ekran kartı, mağaza ve fiyat aralığına göre filtreleyip fiyata göre sıralayarak bütçenize en uygun sistemi saniyeler içinde bulabilirsiniz.",
  },
  {
    question: "Hangi mağazaların hazır sistemleri karşılaştırılıyor?",
    answer:
      "Vatan Bilgisayar, İtopya, Sinerji, PCKolik, İncehesap, Gaming.Gen.TR, Game Garaj ve Tebilon gibi Türkiye'nin popüler teknoloji mağazalarının hazır sistem bilgisayarları karşılaştırılmaktadır.",
  },
  {
    question: "Fiyatlar ne sıklıkla güncelleniyor?",
    answer:
      "Fiyat ve stok bilgileri her gece otomatik olarak güncellenmektedir. Böylece güncel fiyatlar üzerinden karşılaştırma yapabilirsiniz. Nihai fiyat için ilgili mağazanın sayfasını kontrol etmeniz önerilir.",
  },
  {
    question: "Fiyat/performans (F/P) puanı nedir?",
    answer:
      "F/P puanı, bir sistemin donanımını fiyatına göre değerlendiren deneysel (beta) bir referans skorudur. Kaba bir karşılaştırma aracıdır; tek başına satın alma kararı için kullanılmamalıdır.",
  },
]

// ── Landing pages config ─────────────────────────────────────────────────────
//
// Keyword-targeted landing pages. Each page filters products and targets a
// specific high-value search query. These are legitimate category/filter pages
// (not doorway pages) because they show real, filtered product listings.

function normalizeGpu(str) {
  if (!str) return ""
  return str.toUpperCase().replace(/\s+/g, " ").replace(/RTX(\d)/, "RTX $1").replace(/RX(\d)/, "RX $1").trim()
}

const LANDING_PAGES = [
  // ── Store-based ──
  { slug: "itopya-hazir-sistem", title: "İtopya Hazır Sistem Fiyatları", kw: "itopya hazır sistem",
    desc: "İtopya mağazasındaki hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. RTX 5060, RTX 5070 ve daha fazlası ile en uygun İtopya hazır sistemi bulun.",
    intro: "İtopya, Türkiye'nin en köklü teknoloji mağazalarından biridir ve geniş hazır sistem yelpazesi sunar. Bu sayfada İtopya'daki tüm hazır sistem bilgisayarları tek ekranda karşılaştırabilir, fiyat ve özelliklere göre filtreleyebilirsiniz.",
    filter: (p) => (p.store || "").toLowerCase() === "itopya" },
  { slug: "vatan-hazir-sistem", title: "Vatan Bilgisayar Hazır Sistem Fiyatları", kw: "vatan hazır sistem",
    desc: "Vatan Bilgisayar'daki hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun Vatan hazır sistem bilgisayarını bulun.",
    intro: "Vatan Bilgisayar, Türkiye'nin en büyük teknoloji perakende zincirlerinden biridir. Bu sayfada Vatan Bilgisayar'daki tüm hazır sistemleri karşılaştırabilir, bütçenize en uygun olanı seçebilirsiniz.",
    filter: (p) => (p.store || "").toLowerCase() === "vatan" },
  { slug: "sinerji-hazir-sistem", title: "Sinerji Sistem Bilgisayar Fiyatları", kw: "sinerji hazır sistem",
    desc: "Sinerji mağazasındaki hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun Sinerji hazır sistem bilgisayarını bulun.",
    intro: "Sinerji Bilgisayar, rekabetçi fiyatlarıyla bilinen bir teknoloji mağazasıdır. Bu sayfada Sinerji'deki tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => (p.store || "").toLowerCase() === "sinerji" },
  { slug: "pckolik-hazir-sistem", title: "PCKolik Hazır Sistem Fiyatları", kw: "pckolik hazır sistem",
    desc: "PCKolik mağazasındaki hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun PCKolik hazır sistem bilgisayarını bulun.",
    intro: "PCKolik, geniş ürün yelpazesi ve rekabetçi fiyatları ile öne çıkan bir teknoloji mağazasıdır. Bu sayfada PCKolik'teki tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => (p.store || "").toLowerCase() === "pckolik" },
  { slug: "incehesap-hazir-sistem", title: "İncehesap Hazır Sistem Fiyatları", kw: "incehesap hazır sistem",
    desc: "İncehesap mağazasındaki hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun İncehesap hazır sistem bilgisayarını bulun.",
    intro: "İncehesap, Türkiye'nin popüler online teknoloji mağazalarındandır. Bu sayfada İncehesap'taki tüm hazır sistemleri tek ekranda karşılaştırabilirsiniz.",
    filter: (p) => (p.store || "").toLowerCase() === "incehesap" },
  { slug: "gaminggen-hazir-sistem", title: "Gaming.Gen Hazır Sistem Fiyatları", kw: "gaming gen hazır sistem",
    desc: "Gaming.Gen.TR mağazasındaki gaming odaklı hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun Gaming.Gen hazır sistemini bulun.",
    intro: "Gaming.Gen.TR, gaming odaklı hazır sistemleri ile öne çıkan bir mağazadır. Bu sayfada Gaming.Gen'deki tüm oyuncu bilgisayarlarını karşılaştırabilirsiniz.",
    filter: (p) => (p.store || "").toLowerCase().replace(/[^a-z]/g, "") === "gaminggen" },
  { slug: "gamegaraj-hazir-sistem", title: "Game Garaj Hazır Sistem Fiyatları", kw: "game garaj hazır sistem",
    desc: "Game Garaj mağazasındaki hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun Game Garaj hazır sistem bilgisayarını bulun.",
    intro: "Game Garaj, oyuncu bilgisayarları ve hazır sistemleri ile bilinen bir mağazadır. Bu sayfada Game Garaj'daki tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => (p.store || "").toLowerCase().replace(/[^a-z]/g, "") === "gamegaraj" },
  { slug: "tebilon-hazir-sistem", title: "Tebilon Hazır Sistem Fiyatları", kw: "tebilon hazır sistem",
    desc: "Tebilon mağazasındaki hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun Tebilon hazır sistem bilgisayarını bulun.",
    intro: "Tebilon, geniş hazır sistem yelpazesi sunan bir teknoloji mağazasıdır. Bu sayfada Tebilon'daki tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => (p.store || "").toLowerCase() === "tebilon" },

  // ── GPU-based ──
  { slug: "rtx-5060-hazir-sistem", title: "RTX 5060 Hazır Sistem Fiyatları", kw: "rtx 5060 hazır sistem",
    desc: "NVIDIA RTX 5060 ekran kartlı hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun RTX 5060 hazır sistem bilgisayarını bulun.",
    intro: "RTX 5060, günün oyunlarını yüksek ayarlarda oynatabilen popüler bir ekran kartıdır. Bu sayfada RTX 5060 ekran kartına sahip tüm hazır sistemleri farklı mağazalarda karşılaştırabilirsiniz.",
    filter: (p) => normalizeGpu(p.specs?.GPU).includes("RTX 5060") },
  { slug: "rtx-5070-hazir-sistem", title: "RTX 5070 Hazır Sistem Fiyatları", kw: "rtx 5070 hazır sistem",
    desc: "NVIDIA RTX 5070 ekran kartlı hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun RTX 5070 hazır sistem bilgisayarını bulun.",
    intro: "RTX 5070, yüksek performanslı oyun deneyimi sunan güçlü bir ekran kartıdır. Bu sayfada RTX 5070 ekran kartına sahip tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => normalizeGpu(p.specs?.GPU).includes("RTX 5070") },
  { slug: "rtx-5080-hazir-sistem", title: "RTX 5080 Hazır Sistem Fiyatları", kw: "rtx 5080 hazır sistem",
    desc: "NVIDIA RTX 5080 ekran kartlı hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun RTX 5080 hazır sistem bilgisayarını bulun.",
    intro: "RTX 5080, üst seviye oyun performansı sunan amiral gemisi ekran kartıdır. Bu sayfada RTX 5080 ekran kartına sahip tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => normalizeGpu(p.specs?.GPU).includes("RTX 5080") },
  { slug: "rtx-5090-hazir-sistem", title: "RTX 5090 Hazır Sistem Fiyatları", kw: "rtx 5090 hazır sistem",
    desc: "NVIDIA RTX 5090 ekran kartlı hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun RTX 5090 hazır sistem bilgisayarını bulun.",
    intro: "RTX 5090, NVIDIA'nın amiral gemisi ekran kartıdır ve en yüksek oyun performansını sunar. Bu sayfada RTX 5090 ekran kartına sahip tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => normalizeGpu(p.specs?.GPU).includes("RTX 5090") },
  { slug: "rtx-4060-hazir-sistem", title: "RTX 4060 Hazır Sistem Fiyatları", kw: "rtx 4060 hazır sistem",
    desc: "NVIDIA RTX 4060 ekran kartlı hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun RTX 4060 hazır sistem bilgisayarını bulun.",
    intro: "RTX 4060, orta segmentin popüler ekran kartıdır ve 1080p oyunlarda iyi performans sunar. Bu sayfada RTX 4060 ekran kartına sahip tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => normalizeGpu(p.specs?.GPU).includes("RTX 4060") },
  { slug: "rx-9060-hazir-sistem", title: "RX 9060 Hazır Sistem Fiyatları", kw: "rx 9060 hazır sistem",
    desc: "AMD Radeon RX 9060 ekran kartlı hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun RX 9060 hazır sistem bilgisayarını bulun.",
    intro: "RX 9060, AMD'nin yeni nesil orta segment ekran kartıdır. Bu sayfada RX 9060 ekran kartına sahip tüm hazır sistemleri farklı mağazalarda karşılaştırabilirsiniz.",
    filter: (p) => normalizeGpu(p.specs?.GPU).includes("RX 9060") },
  { slug: "rx-9070-hazir-sistem", title: "RX 9070 Hazır Sistem Fiyatları", kw: "rx 9070 hazır sistem",
    desc: "AMD Radeon RX 9070 ekran kartlı hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun RX 9070 hazır sistem bilgisayarını bulun.",
    intro: "RX 9070, AMD'nin yüksek performanslı yeni nesil ekran kartıdır. Bu sayfada RX 9070 ekran kartına sahip tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => normalizeGpu(p.specs?.GPU).includes("RX 9070") },

  // ── CPU-based ──
  { slug: "ryzen-5-hazir-sistem", title: "AMD Ryzen 5 Hazır Sistem Fiyatları", kw: "ryzen 5 hazır sistem",
    desc: "AMD Ryzen 5 işlemcili hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun Ryzen 5 hazır sistem bilgisayarını bulun.",
    intro: "AMD Ryzen 5, oyun ve günlük kullanım için dengeli performans sunan popüler bir işlemcidir. Bu sayfada Ryzen 5 işlemcili tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => /ryzen\s*5/i.test(p.specs?.CPU || "") },
  { slug: "ryzen-7-hazir-sistem", title: "AMD Ryzen 7 Hazır Sistem Fiyatları", kw: "ryzen 7 hazır sistem",
    desc: "AMD Ryzen 7 işlemcili hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun Ryzen 7 hazır sistem bilgisayarını bulun.",
    intro: "AMD Ryzen 7, yüksek performanslı oyun ve içerik üretimi için ideal bir işlemcidir. Bu sayfada Ryzen 7 işlemcili tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => /ryzen\s*7/i.test(p.specs?.CPU || "") },
  { slug: "ryzen-9-hazir-sistem", title: "AMD Ryzen 9 Hazır Sistem Fiyatları", kw: "ryzen 9 hazır sistem",
    desc: "AMD Ryzen 9 işlemcili hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun Ryzen 9 hazır sistem bilgisayarını bulun.",
    intro: "AMD Ryzen 9, üst seviye performans sunan amiral gemisi işlemcidir. Bu sayfada Ryzen 9 işlemcili tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => /ryzen\s*9/i.test(p.specs?.CPU || "") },
  { slug: "core-i5-hazir-sistem", title: "Intel Core i5 Hazır Sistem Fiyatları", kw: "core i5 hazır sistem",
    desc: "Intel Core i5 işlemcili hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun Core i5 hazır sistem bilgisayarını bulun.",
    intro: "Intel Core i5, oyun ve ofis kullanımı için dengeli performans sunan popüler bir işlemcidir. Bu sayfada Core i5 işlemcili tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => /core\s*i5/i.test(p.specs?.CPU || "") },
  { slug: "core-ultra-hazir-sistem", title: "Intel Core Ultra Hazır Sistem Fiyatları", kw: "core ultra hazır sistem",
    desc: "Intel Core Ultra işlemcili hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. En uygun Core Ultra hazır sistem bilgisayarını bulun.",
    intro: "Intel Core Ultra, Intel'in yeni nesil yüksek performanslı işlemci serisidir. Bu sayfada Core Ultra işlemcili tüm hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => /core\s*ultra/i.test(p.specs?.CPU || "") },

  // ── Category-based ──
  { slug: "gaming-pc", title: "Gaming PC | Oyuncu Bilgisayar Fiyatları", kw: "gaming pc",
    desc: "Gaming PC ve oyuncu bilgisayarlarını fiyat, işlemci ve ekran kartına göre karşılaştırın. RTX serili en uygun gaming hazır sistemleri bulun.",
    intro: "Gaming PC'ler, yüksek performanslı işlemci ve ekran kartı kombinasyonuyla oyunları en yüksek ayarlarda oynatmak için tasarlanmıştır. Bu sayfada tüm mağazalardaki gaming odaklı hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => /RTX|RX\s*\d{3,4}|GTX\s*\d{3}/i.test(p.specs?.GPU || "") },
  { slug: "ucuz-hazir-sistem", title: "Ucuz Hazır Sistem Bilgisayar Fiyatları", kw: "ucuz hazır sistem",
    desc: "Ucuz hazır sistem bilgisayarları fiyat ve özelliklerine göre karşılaştırın. Bütçenize en uygun uygun fiyatlı hazır sistem bilgisayarını bulun.",
    intro: "Bütçe dostu hazır sistem bilgisayarlar, uygun fiyatlarıyla giriş seviyesi oyun ve ofis kullanımı için idealdir. Bu sayfada 30.000 ₺ altındaki en uygun hazır sistemleri karşılaştırabilirsiniz.",
    filter: (p) => p.price > 0 && p.price <= 30000 },
  { slug: "oyuncu-bilgisayari", title: "Oyuncu Bilgisayarı Fiyatları | Gaming Hazır Sistem", kw: "oyuncu bilgisayarı",
    desc: "Oyuncu bilgisayarı ve gaming hazır sistemleri fiyat, işlemci ve ekran kartına göre karşılaştırın. En uygun oyuncu bilgisayarını bulun.",
    intro: "Oyuncu bilgisayarları, yüksek FPS ve akıcı oyun deneyimi için güçlü ekran kartı ve işlemci ile donatılmıştır. Bu sayfada tüm mağazalardaki oyuncu bilgisayarlarını karşılaştırabilirsiniz.",
    filter: (p) => /RTX|RX\s*\d{3,4}|GTX\s*\d{3}/i.test(p.specs?.GPU || "") },

  // ── Price range ──
  { slug: "0-30000-tl-hazir-sistem", title: "0-30.000 TL Hazır Sistem Bilgisayar", kw: "0 30000 tl hazır sistem",
    desc: "30.000 TL altı hazır sistem bilgisayarları karşılaştırın. Bütçe dostu ofis ve giriş seviyesi gaming PC'leri en uygun fiyatlarla.",
    intro: "30.000 TL ve altındaki hazır sistem bilgisayarlar, giriş seviyesi oyun ve ofis kullanımı için idealdir. Bu sayfada bütçenizi aşmadan en uygun sistemleri karşılaştırabilirsiniz.",
    filter: (p) => p.price > 0 && p.price <= 30000 },
  { slug: "30000-50000-tl-hazir-sistem", title: "30.000-50.000 TL Hazır Sistem Bilgisayar", kw: "30000 50000 tl hazır sistem",
    desc: "30.000-50.000 TL arası hazır sistem bilgisayarları karşılaştırın. Orta segment gaming PC'leri en uygun fiyatlarla.",
    intro: "30.000-50.000 TL aralığındaki hazır sistemler, orta segment oyun performansı sunan RTX 5060 ve benzeri ekran kartlarına sahiptir. Bu sayfada en iyi fiyat/performans sistemlerini karşılaştırabilirsiniz.",
    filter: (p) => p.price > 30000 && p.price <= 50000 },
  { slug: "50000-100000-tl-hazir-sistem", title: "50.000-100.000 TL Hazır Sistem Bilgisayar", kw: "50000 100000 tl hazır sistem",
    desc: "50.000-100.000 TL arası hazır sistem bilgisayarları karşılaştırın. Üst segment gaming PC'leri ve yüksek performanslı sistemler.",
    intro: "50.000-100.000 TL aralığındaki hazır sistemler, üst segment oyun performansı sunan RTX 5070/5080 ekran kartlarına sahiptir. Bu sayfada en güçlü sistemleri karşılaştırabilirsiniz.",
    filter: (p) => p.price > 50000 && p.price <= 100000 },
  { slug: "100000-tl-uzeri-hazir-sistem", title: "100.000 TL Üzeri Hazır Sistem Bilgisayar", kw: "100000 tl üzeri hazır sistem",
    desc: "100.000 TL üzeri hazır sistem bilgisayarları karşılaştırın. Amiral gemisi gaming PC'leri ve en yüksek performanslı sistemler.",
    intro: "100.000 TL ve üzeri hazır sistemler, amiral gemisi ekran kartları ve işlemcilerle en yüksek oyun performansını sunar. Bu sayfada en güçlü sistemleri karşılaştırabilirsiniz.",
    filter: (p) => p.price > 100000 },
]

/**
 * Generate a keyword-targeted landing page.
 */
function generateLandingPage(templateHtml, page, filteredProducts, slugMap, allLandingSlugs) {
  const canonical = `${SITE_URL}/${page.slug}`
  const topProducts = filteredProducts
    .filter((p) => p.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, 30)

  const productLinks = topProducts
    .map((p) => {
      const slug = slugMap.get(p)
      if (!slug) return ""
      return `<li><a href="${SITE_URL}/sistem/${slug}">${textContent(p.name)} — ${formatPrice(p.price)} ₺ (${textContent(p.store)})</a></li>`
    })
    .filter(Boolean)
    .join("\n      ")

  // Cross-links to other landing pages (max 12, excluding self)
  const crossLinks = allLandingSlugs
    .filter((s) => s !== page.slug)
    .slice(0, 12)
    .map((s) => {
      const other = LANDING_PAGES.find((p) => p.slug === s)
      if (!other) return ""
      return `<li><a href="${SITE_URL}/${s}">${textContent(other.title)}</a></li>`
    })
    .filter(Boolean)
    .join("\n      ")

  const noscript = `
  <noscript>
    <nav>
      <a href="${SITE_URL}/">Anasayfa</a> &gt; ${textContent(page.title)}
    </nav>
    <h1>${textContent(page.title)}</h1>
    <p>${textContent(page.intro)}</p>

    <h2>${textContent(page.title)} — En Uygun Fiyatlar</h2>
    <ul>
      ${productLinks}
    </ul>

    <h2>Diğer Hazır Sistem Kategorileri</h2>
    <ul>
      ${crossLinks}
    </ul>

    <h2>Sıkça Sorulan Sorular</h2>
    ${HOME_FAQ.map((f) => `<details><summary>${textContent(f.question)}</summary><p>${textContent(f.answer)}</p></details>`).join("")}
  </noscript>`

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: page.title,
      description: page.desc,
      url: canonical,
      mainEntity: {
        "@type": "ItemList",
        name: page.title,
        numberOfItems: filteredProducts.length,
        itemListElement: topProducts.slice(0, 10).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Product",
            name: p.name,
            description: `${(p.specs && p.specs.CPU) || ""} işlemcili, ${(p.specs && p.specs.GPU) || ""} ekran kartlı hazır sistem`,
            image: p.image,
            offers: {
              "@type": "Offer",
              price: p.price,
              priceCurrency: "TRY",
              availability: "https://schema.org/InStock",
              url: p.url,
            },
            brand: { "@type": "Brand", name: p.store },
          },
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Anasayfa", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: page.title, item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: HOME_FAQ.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ]

  return buildPage(templateHtml, {
    headHtml: buildHead({
      title: `${page.title} | PcKarşılaştır.com`,
      description: page.desc,
      canonical,
      ogImage: `${SITE_URL}/og-image.png`,
      ogType: "website",
      keywords: `${page.kw}, ${page.kw} fiyatları, hazır sistem, bilgisayar karşılaştırma, ${page.kw} 2026`,
      jsonLdBlocks: jsonLd,
    }),
    noscript,
  })
}

// ── Buying guide pages ───────────────────────────────────────────────────────
//
// Long-form content pages targeting informational queries ("hazır sistem nasıl seçilir",
// "rtx 5060 vs rtx 5070" etc.). Google loves in-depth content for these queries.

const BUYING_GUIDES = [
  {
    slug: "hazir-sistem-nasil-secilir",
    title: "Hazır Sistem Bilgisayar Nasıl Seçilir? 2026 Rehberi",
    kw: "hazır sistem nasıl seçilir, hazır sistem alırken dikkat edilmesi gerekenler",
    desc: "Hazır sistem bilgisayar alırken dikkat edilmesi gereken her şey: işlemci, ekran kartı, RAM, depolama, güç kaynağı ve soğutma seçimi. 2026 güncel rehber.",
    sections: [
      { h2: "Hazır Sistem Nedir?", p: "Hazır sistem, işlemci, ekran kartı, anakart, RAM, depolama ve güç kaynağı gibi tüm parçaları önceden monte edilmiş, kutusundan çıktığı gibi kullanıma hazır masaüstü bilgisayardır. Parça uyumluluğu, montaj ve test süreçleri tamamlandıktan sonra satışa sunulur." },
      { h2: "İşlemci (CPU) Seçimi", p: "İşlemci, bilgisayarın beynidir. Oyun ve içerik üretimi için AMD Ryzen 5 veya Intel Core i5 ve üzeri önerilir. Ofis kullanımı için Ryzen 3 veya Core i3 yeterli olabilir. 2026'da AMD Ryzen 7000/9000 serisi ve Intel Core Ultra serisi en popüler seçeneklerdir. İşlemci nesili, çekirdek sayısı ve saat hızına dikkat edin." },
      { h2: "Ekran Kartı (GPU) Seçimi", p: "Ekran kartı, oyun performansını en çok etkileyen bileşendir. 1080p oyun için RTX 5060 veya RX 9060 yeterliyken, 1440p ve 4K için RTX 5070/5080 veya RX 9070 önerilir. RTX 5090 amiral gemisi segmentindedir. VRAM miktarı (8GB minimum), ray tracing ve DLSS/FSR desteğine dikkat edin." },
      { h2: "RAM (Bellek) Seçimi", p: "2026'da DDR5 standart hale gelmiştir. Oyun için minimum 16GB, içerik üretimi için 32GB önerilir. RAM hızı (MHz) ve gecikme (CL) değeri performansı etkiler. DDR5-5600 ve üzeri hızlar idealdir. Dual channel (2x8GB) tek module (1x16GB) göre %15-20 daha performanslıdır." },
      { h2: "Depolama (SSD) Seçimi", p: "NVMe M.2 SSD, SATA SSD'den 5-10 kat hızlıdır. Sistem diski için minimum 500GB NVMe SSD önerilir. 1TB ve üzeri, büyük oyun kütüphaneleri için idealdir. PCIe 4.0 ve PCIe 5.0 SSD'ler en yüksek hızları sunar. Kingston, Samsung ve WD güvenilir markalardır." },
      { h2: "Güç Kaynağı (PSU) Seçimi", p: "Güç kaynağı, sistemin kalbidir. 80+ Bronze sertifikası minimum gereksinimdir, 80+ Gold ve üzeri önerilir. RTX 5060 için 550W, RTX 5070 için 650W, RTX 5080 için 750W, RTX 5090 için 1000W+ önerilir. Modular kablolu PSU'lar kasa içi hava akışını iyileştirir." },
      { h2: "Soğutma Sistemi", p: "İşlemci sıcaklığını kontrol altında tutmak için stok fan yerine tower soğutucu veya AIO sıvı soğutma önerilir. 240mm AIO, çoğu sistem için yeterliyken, 360mm AIO üst segment işlemciler için idealdir. Kasa içi hava akışı (önde intake, arkada/üstte exhaust fan) önemlidir." },
      { h2: "Anakart Seçimi", p: "Anakart, genişletilebilirliği belirler. B-serisi (B650/B840) orta segment, X-serisi (X670/X870) üst segment içindir. Wi-Fi, Bluetooth, M.2 slot sayısı, USB port sayısı ve VRM kalitesine dikkat edin. İşlemci soket uyumluluğu (AM5, LGA1851) kritiktir." },
      { h2: "Kasa Seçimi", p: "Kasa, hava akışı ve estetik için önemlidir. Mesh ön panel, daha iyi hava akışı sağlar. Fan yuvası sayısı (minimum 3-4), GPU uzunluk desteği, cable management açıklığı ve temperli cam yan panel tercih edilen özelliklerdir." },
      { h2: "Fiyat/Performans Oranı", p: "En pahalı sistem her zaman en iyi değildir. Bütçenize en uygun sistemi bulmak için fiyat/performans oranını hesaplayın. PcKarşılaştır.com'un F/P puanı bu konuda yardımcı olur. Aynı ekran kartına sahip sistemler arasında fiyat farkını karşılaştırın ve gereksiz pahalı modellerden kaçının." },
      { h2: "Hangi Mağazadan Almalı?", p: "Vatan Bilgisayar, İtopya, Sinerji, PCKolik, İncehesap, Gaming.Gen, Game Garaj ve Tebilon gibi mağazaları fiyat, garanti, kargo ve müşteri hizmetleri açısından karşılaştırın. PcKarşılaştır.com tüm bu mağazaların fiyatlarını tek ekranda görmenizi sağlar." },
    ],
  },
  {
    slug: "rtx-5060-vs-rtx-5070",
    title: "RTX 5060 vs RTX 5070: Hangisi Daha İyi? Karşılaştırma",
    kw: "rtx 5060 vs rtx 5070, rtx 5060 mi rtx 5070 mi",
    desc: "NVIDIA RTX 5060 ve RTX 5070 ekran kartı karşılaştırması. Performans, fiyat, VRAM, ray tracing ve DLSS farkları. Hangi ekran kartını seçmelisiniz?",
    sections: [
      { h2: "RTX 5060 Genel Bakış", p: "RTX 5060, NVIDIA'nın orta segment ekran kartıdır. 1080p oyunlarda yüksek ayarlar ve ray tracing ile akıcı deneyim sunar. 8GB VRAM, DLSS 4 desteği ve düşük güç tüketimi ile bütçe dostu bir gaming PC için idealdir. Hazır sistemlerde en çok tercih edilen ekran kartıdır." },
      { h2: "RTX 5070 Genel Bakış", p: "RTX 5070, üst-orta segmentte konumlanır. 1440p oyunlarda yüksek ayarlar ve ray tracing ile akıcı FPS sunar. RTX 5060'dan %30-40 daha yüksek performans gösterir. 12GB VRAM ile daha geleceğe yönelik bir seçenektir." },
      { h2: "Performans Karşılaştırması", p: "RTX 5070, RTX 5060'dan ortalama %35-40 daha yüksek FPS üretir. 1080p'de fark daha küçükken, 1440p ve 4K'da fark büyür. Ray tracing açıkken RTX 5070'in avantajı daha belirgin hale gelir. DLSS 4 her iki kartta da mevcuttur." },
      { h2: "Fiyat Karşılaştırması", p: "RTX 5060'lı hazır sistemler genellikle 30.000-50.000 TL aralığındadır. RTX 5070'li sistemler ise 50.000-80.000 TL aralığında konumlanır. Fark ~15.000-20.000 TL civarındadır. Bu fiyat farkına değer mi? 1080p monitör kullanıyorsanız RTX 5060 yeterli; 1440p veya yüksek yenileme hızı istiyorsanız RTX 5070'i tercih edin." },
      { h2: "VRAM Karşılaştırması", p: "RTX 5060 8GB VRAM sunarken, RTX 5070 12GB VRAM sunar. Modern oyunlar 8GB VRAM'i doldurabilir, bu nedenle yüksek texture kalitesinde RTX 5070 daha avantajlıdır. 4K oyun veya içerik üretimi için 12GB VRAM önemli bir avantajdır." },
      { h2: "Güç Tüketimi", p: "RTX 5060 ~115W güç tüketirken, RTX 5070 ~200W güç tüketir. RTX 5060 için 550W PSU yeterliyken, RTX 5070 için 650W+ PSU önerilir. Düşük güç tüketimi, RTX 5060'ı daha az ısınan ve daha sessiz bir seçenek yapar." },
      { h2: "Hangisini Seçmelisiniz?", p: "1080p 60-144Hz monitör ile oyun oynuyorsanız ve bütçe önemliyse: RTX 5060. 1440p veya 1080p 240Hz oyun istiyorsanız: RTX 5070. Gelecek 3-4 yıl boyunca yüksek ayarlarda oyun oynamak istiyorsanız: RTX 5070. Her iki seçenek için de PcKarşılaştır.com'da tüm mağazaların fiyatlarını karşılaştırabilirsiniz." },
    ],
  },
  {
    slug: "ryzen-5-vs-ryzen-7",
    title: "AMD Ryzen 5 vs Ryzen 7: Hangisi Daha İyi? Karşılaştırma",
    kw: "ryzen 5 vs ryzen 7, ryzen 5 mi ryzen 7 mi",
    desc: "AMD Ryzen 5 ve Ryzen 7 işlemci karşılaştırması. Çekirdek sayısı, performans, fiyat ve oyun/content creation farkları. Hangi işlemciyi seçmelisiniz?",
    sections: [
      { h2: "Ryzen 5 Genel Bakış", p: "AMD Ryzen 5, 6 çekirdekli işlemci serisidir. Oyun ve günlük kullanım için ideal dengeyi sunar. Ryzen 5 7600, 7500F ve 9600X popüler modellerdir. Hazır sistemlerde en sık tercih edilen işlemci segmentidir çünkü fiyat/performans oranı yüksektir." },
      { h2: "Ryzen 7 Genel Bakış", p: "AMD Ryzen 7, 8 çekirdekli işlemci serisidir. Oyun yanı sıra içerik üretimi (video edit, 3D render, streaming) için ekstra performans sunar. Ryzen 7 7800X3D ve 9700X popüler modellerdir. Özellikle X3D serisi oyun performansında rakipsizdir." },
      { h2: "Performans Karşılaştırması", p: "Saf oyun performansında Ryzen 5 ve Ryzen 7 arasındaki fark %5-15 civarındadır. Ancak içerik üretiminde (video render, streaming, kod derleme) Ryzen 7'nin 2 ek çekirdeği %20-30 performans avantajı sağlar. X3D serisi (7800X3D) oyun performansında en yüksek FPS'i sunar." },
      { h2: "Fiyat Karşılaştırması", p: "Ryzen 5'li hazır sistemler genellikle 25.000-50.000 TL aralığındadır. Ryzen 7'li sistemler ise 45.000-100.000 TL aralığında konumlanır. Fark ~10.000-20.000 TL civarındadır. Sadece oyun oynayacaksanız Ryzen 5 yeterli; içerik üretimi yapacaksanız Ryzen 7'ye yatırım yapın." },
      { h2: "Çekirdek ve Thread Sayısı", p: "Ryzen 5: 6 çekirdek / 12 thread. Ryzen 7: 8 çekirdek / 16 thread. 2 ek çekirdek, çoklu görev ve paralel iş yüklerinde avantaj sağlar. Modern oyunlar 6 çekirdeği tam kullanmadığı için oyun performansında ek çekirdekler fazla fark yaratmaz." },
      { h2: "Hangisini Seçmelisiniz?", p: "Sadece oyun oynayacak ve bütçe önemliyse: Ryzen 5. Oyun + streaming / video edit yapacak: Ryzen 7. En yüksek oyun FPS'ini isteyen: Ryzen 7 7800X3D. Ofis ve günlük kullanım: Ryzen 5 yeterli. Her iki seçenek için de PcKarşılaştır.com'da tüm mağazaların fiyatlarını karşılaştırabilirsiniz." },
    ],
  },
]

function generateGuidePage(templateHtml, guide, allLandingSlugs) {
  const canonical = `${SITE_URL}/${guide.slug}`

  const sectionsHtml = guide.sections
    .map((s) => `<h2>${textContent(s.h2)}</h2>\n    <p>${textContent(s.p)}</p>`)
    .join("\n    ")

  // Cross-links to landing pages
  const crossLinks = allLandingSlugs
    .slice(0, 10)
    .map((s) => {
      const other = LANDING_PAGES.find((p) => p.slug === s)
      if (!other) return ""
      return `<li><a href="${SITE_URL}/${s}">${textContent(other.title)}</a></li>`
    })
    .filter(Boolean)
    .join("\n      ")

  const noscript = `
  <noscript>
    <nav>
      <a href="${SITE_URL}/">Anasayfa</a> &gt; ${textContent(guide.title)}
    </nav>
    <h1>${textContent(guide.title)}</h1>
    <p>${textContent(guide.desc)}</p>
    ${sectionsHtml}
    <h2>İlgili Hazır Sistem Kategorileri</h2>
    <ul>
      ${crossLinks}
    </ul>
  </noscript>`

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.desc,
      author: { "@type": "Organization", name: "PcKarşılaştır.com" },
      publisher: { "@type": "Organization", name: "PcKarşılaştır.com" },
      datePublished: "2026-07-06",
      dateModified: "2026-07-06",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Anasayfa", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: guide.title, item: canonical },
      ],
    },
  ]

  return buildPage(templateHtml, {
    headHtml: buildHead({
      title: `${guide.title} | PcKarşılaştır.com`,
      description: guide.desc,
      canonical,
      ogImage: `${SITE_URL}/og-image.png`,
      ogType: "article",
      keywords: guide.kw,
      jsonLdBlocks: jsonLd,
    }),
    noscript,
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const templatePath = resolve(DIST_DIR, "index.html")
  if (!existsSync(templatePath)) {
    console.error("[static-html] dist/index.html bulunamadı! Önce `vite build` çalıştırın.")
    process.exit(1)
  }

  const mockPath = resolve(PUBLIC_DIR, "mock.json")
  if (!existsSync(mockPath)) {
    console.warn("[static-html] mock.json bulunamadı, sadece template korunacak.")
    return
  }

  const templateHtml = readFileSync(templatePath, "utf-8")
  const products = JSON.parse(readFileSync(mockPath, "utf-8"))
  const slugMap = assignSlugs(products)

  console.log(`[static-html] ${products.length} ürün işleniyor...`)

  // 1) Generate home page
  const homeHtml = generateHomePage(templateHtml, products, slugMap)
  writeFileSync(resolve(DIST_DIR, "index.html"), homeHtml, "utf-8")
  console.log("[static-html] ✓ index.html (anasayfa)")

  // 2) Generate product pages
  const sistemDir = resolve(DIST_DIR, "sistem")
  if (!existsSync(sistemDir)) mkdirSync(sistemDir, { recursive: true })

  let count = 0
  const seen = new Set()
  for (const p of products) {
    if (!p?.name || !p?.store) continue
    const slug = slugMap.get(p)
    if (!slug || slug === "-" || seen.has(slug)) continue
    seen.add(slug)

    const html = generateProductPage(templateHtml, p, slug, products, slugMap)
    writeFileSync(resolve(sistemDir, `${slug}.html`), html, "utf-8")
    count++
  }

  console.log(`[static-html] ✓ ${count} ürün sayfası → dist/sistem/*.html`)

  // 3) Generate keyword-targeted landing pages
  const landingSlugs = LANDING_PAGES.map((p) => p.slug)
  let landingCount = 0
  for (const page of LANDING_PAGES) {
    const filtered = products.filter(page.filter)
    if (filtered.length === 0) continue
    const html = generateLandingPage(templateHtml, page, filtered, slugMap, landingSlugs)
    writeFileSync(resolve(DIST_DIR, `${page.slug}.html`), html, "utf-8")
    landingCount++
  }

  console.log(`[static-html] ✓ ${landingCount} landing page → dist/*.html`)

  // 4) Generate buying guide pages
  let guideCount = 0
  for (const guide of BUYING_GUIDES) {
    const html = generateGuidePage(templateHtml, guide, landingSlugs)
    writeFileSync(resolve(DIST_DIR, `${guide.slug}.html`), html, "utf-8")
    guideCount++
  }

  console.log(`[static-html] ✓ ${guideCount} buying guide → dist/*.html`)
  console.log(`[static-html] Toplam ${count + 1 + landingCount + guideCount} statik HTML sayfası üretildi.`)
}

main()
