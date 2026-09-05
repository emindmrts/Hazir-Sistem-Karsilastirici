/**
 * botMeta.mjs — server-rendered meta shell for SOCIAL crawlers.
 *
 * WhatsApp / Twitter / Telegram / LinkedIn / Discord / Slack / Pinterest
 * fetch pages WITHOUT executing JavaScript, so the Helmet-injected OG tags
 * are invisible to them and product links shared in chats show no preview.
 *
 * For requests whose User-Agent matches a social crawler, /sistem/:slug
 * answers with a tiny static HTML document carrying the SAME title /
 * description / image the SPA would set (no cloaking — identical content),
 * plus a human-readable fallback body with a link to the canonical URL.
 *
 * NOTE: search-engine crawlers (Googlebot/Bingbot) are intentionally NOT
 * matched — they render JavaScript and need the full page content.
 */

const SITE_URL = "https://www.pckarsilastir.com";

const SOCIAL_BOT_UA =
  /twitterbot|facebookexternalhit|facebookcatalog|whatsapp|telegrambot|linkedinbot|slackbot|discordbot|pinterestbot|redditbot|skypeuripreview|applebot/i;

export function isSocialBot(userAgent) {
  return SOCIAL_BOT_UA.test(userAgent ?? "");
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absImage(url) {
  const u = String(url ?? "");
  if (!u) return `${SITE_URL}/og-image.png`;
  if (/^https?:\/\//i.test(u)) return u;
  return SITE_URL + (u.startsWith("/") ? u : `/${u}`);
}

/** Same title/description formula as DetailPage (detail-page.tsx). */
export function botHtml(product) {
  const name = product.sistemAdi || product.name || "Hazır Sistem";
  const store = product.magaza || product.store || "";
  const price = Number(product.fiyat ?? product.price ?? 0);
  const priceTr = price > 0 ? price.toLocaleString("tr-TR") : "";
  const slug = product.slug ?? "";
  const canonical = `${SITE_URL}/sistem/${slug}`;

  const title = store ? `${name} | ${store}` : name;
  const desc =
    `${store ? store + " mağazasından " : ""}${name} hazır sistem bilgisayarı.` +
    (product.islemci ? ` ${product.islemci} işlemcili` : "") +
    (product.ekranKarti ? ` ve ${product.ekranKarti} ekran kartlı` : "") +
    (priceTr ? ` bu sistemi ${priceTr} ₺ fiyatıyla inceleyin.` : "");
  const image = absImage(product.resimUrl || product.image);

  const t = esc(title);
  const d = esc(desc);

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<title>${t} | PcKarşılaştır.com</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${esc(canonical)}" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:type" content="product" />
<meta property="og:site_name" content="PcKarşılaştır.com" />
<meta property="og:locale" content="tr_TR" />
${price > 0 ? `<meta property="product:price:amount" content="${price}" />\n<meta property="product:price:currency" content="TRY" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${esc(image)}" />
</head>
<body>
<h1>${t}</h1>
<p>${d}</p>
${priceTr ? `<p><strong>${esc(priceTr)} ₺</strong></p>` : ""}
<p><a href="${esc(canonical)}">Ürünü PcKarşılaştır.com'da incele</a></p>
</body>
</html>
`;
}
