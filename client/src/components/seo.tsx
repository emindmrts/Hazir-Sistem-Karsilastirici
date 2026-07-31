import { Helmet } from "react-helmet-async"

interface SEOProps {
  title?: string
  description?: string
  canonical?: string
  ogImage?: string
  ogType?: string
  keywords?: string
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export function SEO({
  title = "PcKarşılaştır.com | PC Konfigürasyon & Sistem Karşılaştırması",
  description = "Türkiye'nin tüm mağazalarındaki hazır sistemleri fiyat, işlemci ve ekran kartına göre karşılaştırın. En uygun sistemi PcKarşılaştır.com'da bulun.",
  canonical = "https://www.pckarsilastir.com",
  ogImage = "https://www.pckarsilastir.com/og-image.png",
  ogType = "website",
  keywords,
  jsonLd,
}: SEOProps) {
  const siteTitle = title.includes("PcKarşılaştır") ? title : `${title} | PcKarşılaştır.com`
  const jsonLdBlocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <Helmet>
      {/* Basic Metadata */}
      <html lang="tr" />
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical} />
      <meta name="language" content="Turkish" />
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />

      {/* Open Graph */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="PcKarşılaştır.com" />
      <meta property="og:locale" content="tr_TR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@PcKarsilastir" />
      <meta name="twitter:creator" content="@PcKarsilastir" />

      {/* Structured Data */}
      {jsonLdBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  )
}
