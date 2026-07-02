import { Helmet } from "react-helmet-async"

interface SEOProps {
  title?: string
  description?: string
  canonical?: string
  ogImage?: string
  jsonLd?: Record<string, unknown>
}

export function SEO({
  title = "PcKarşılaştır.com | PC Konfigürasyon & Sistem Karşılaştırması",
  description = "PcKarşılaştır.com'da Türkiye'nin tüm bilgisayar mağazalarındaki hazır sistemleri karşılaştırın. Fiyat, işlemci, ekran kartı ve diğer özelliklere göre filtreleyin.",
  canonical = "https://www.pckarsilastir.com",
  ogImage = "https://www.pckarsilastir.com/og-image.jpg",
  jsonLd,
}: SEOProps) {
  const siteTitle = title.includes("PcKarşılaştır") ? title : `${title} | PcKarşılaştır.com`

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="language" content="Turkish" />

      {/* Open Graph */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="PcKarşılaştır.com" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:creator" content="@PcKarsilastir" />

      {/* Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  )
}
