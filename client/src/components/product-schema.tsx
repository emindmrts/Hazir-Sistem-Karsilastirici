/**
 * Product Schema Generator
 * Rich snippets for Google Search results
 */

interface ProductSchemaProps {
  name: string;
  description: string;
  price: number | string;
  currency: string;
  image: string;
  inStock: boolean;
  store: string;
  rating?: number;
  reviewCount?: number;
  url: string;
}

/**
 * Generate Product Schema.org structured data
 */
export function ProductSchema({
  name,
  description,
  price,
  currency = 'TRY',
  image,
  inStock,
  store,
  rating = 4.5,
  reviewCount = 0,
  url,
}: ProductSchemaProps) {
  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name,
    description,
    image: [image],
    brand: {
      '@type': 'Brand',
      name: store,
    },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: currency,
      price: String(price),
      itemCondition: 'https://schema.org/NewCondition',
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: store,
      },
    },
    ...(rating && reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating,
        reviewCount,
      },
    }),
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
}

/**
 * FAQPage Schema (FAQ section için)
 */
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQPageSchema(items: FAQItem[]) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
}
