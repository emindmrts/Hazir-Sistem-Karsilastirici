import { Express } from 'express';

/**
 * Dinamik Sitemap Generator
 * Veritabanındaki tüm sistem sayfalarını sitemap'e ekle
 */

interface Product {
  id: string;
  slug: string;
  name: string;
  updatedAt?: Date;
}

/**
 * Veritabanından tüm sistemleri al
 * (Gerçek implementation'da database query yapılır)
 */
async function getAllProducts(): Promise<Product[]> {
  try {
    // TODO: Kendi veritabanı bağlantınızı kullanın
    // const products = await db.products.findAll();
    // return products;
    return [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * XML Sitemap oluştur
 */
function generateSitemapXml(products: Product[]): string {
  const baseUrl = 'https://www.pckarsilastir.com';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Ana sayfa
  xml += `  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

  // Sistem sayfaları
  products.forEach((product) => {
    const lastmod = product.updatedAt 
      ? new Date(product.updatedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    xml += `  <url>
    <loc>${baseUrl}/sistem/${product.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  });

  xml += `</urlset>`;
  return xml;
}

/**
 * Sitemap Index oluştur (büyük siteler için)
 */
function generateSitemapIndex(): string {
  const baseUrl = 'https://www.pckarsilastir.com';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-pages.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-products.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
</sitemapindex>`;
}

/**
 * Express endpoint setup
 */
export function setupSitemapRoutes(app: Express): void {
  // Ana sitemap.xml
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const products = await getAllProducts();
      const sitemap = generateSitemapXml(products);
      
      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error('Sitemap generation error:', error);
      res.status(500).send('Sitemap generation failed');
    }
  });

  // Sitemap index (opsiyonel)
  app.get('/sitemap-index.xml', (req, res) => {
    try {
      const index = generateSitemapIndex();
      res.header('Content-Type', 'application/xml');
      res.send(index);
    } catch (error) {
      console.error('Sitemap index error:', error);
      res.status(500).send('Sitemap index failed');
    }
  });
}

export { getAllProducts };
