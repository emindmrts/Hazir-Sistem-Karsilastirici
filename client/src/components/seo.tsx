import { Helmet } from "react-helmet-async"

interface SEOProps {
  title?: string
  description?: string
  canonical?: string
  ogImage?: string
  jsonLd?: Record<string, any>
}

export function SEO({
  title = "Ucuza Sistem | Hazır Sistem Karşılaştırma",
  description = "İtopya, Vatan, Sinerji ve daha fazla mağazadaki hazır sistemleri tek bir sayfada karşılaştırın.",
  canonical = "https://www.ucuzasistem.com",
  ogImage = "https://www.ucuzasistem.com/og-image.jpg",
  jsonLd,
}: SEOProps) {
  const siteTitle = title.includes("Ucuza Sistem") ? title : `${title} | Ucuza Sistem`

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonical} />

      {/* Twitter */}
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  )
}
