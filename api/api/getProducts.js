import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    // Vercel uzerinde dosya yolu genellikle process.cwd() (proje koku) icindedir.
    const filePath = path.join(process.cwd(), 'mock.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const products = JSON.parse(fileContents);
    
    // Frontend POST /api/getProducts atarak calisiyor
    if (req.method === 'POST') {
      const { page = 1, pageSize = 60 } = req.body || {};
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      return res.status(200).json({
        data: products.slice(start, end),
        total: products.length,
        page: page,
        pageSize: pageSize
      });
    }
    
    // GET istegi gelirse hepsini don
    res.status(200).json(products);
  } catch (error) {
    console.error('Vercel Serverless Hatasi:', error);
    res.status(500).json({ error: 'Urunler yuklenirken sunucu hatasi olustu.' });
  }
}
