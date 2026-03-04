# Ucuza Sistem

> Bu repo, orijinal projenin bir fork'udur. Ana fork'taki mevcut hatalar giderilmiş, eksik özellikler tamamlanmış ve proje çalışabilir hale getirilmiştir.

Türkiye'nin önde gelen bilgisayar mağazalarındaki hazır sistemleri tek bir arayüzde karşılaştırmak için geliştirilmiş bir web uygulaması.

---

## Özellikler

- Anlık ürün arama
- Fiyat, mağaza, işlemci ve ekran kartına göre filtreleme
- Fiyata göre sıralama (artan / azalan)
- Açık / koyu tema desteği
- Sayfa geçişlerinde GSAP animasyonları
- Her gece 03:00'de otomatik veri güncelleme
- Dosya değişikliğine dayalı in-memory cache

**Desteklenen mağazalar:** Vatan, İtopya, Sinerji, PcKolik, Tebilon, İnceHesap, Gencer Gaming, Gaming Gen, Game Garaj

---

## Teknoloji Stack'i

**Frontend**
- React 18, Vite, TypeScript
- Tailwind CSS, shadcn/ui
- GSAP (ScrollTrigger)

**Backend**
- Node.js (ESM), Express.js
- Puppeteer (JS gerektiren siteler için)
- JSDOM + node-fetch (statik HTML siteler için)
- node-cron, Morgan, Swagger

---

## Kurulum

Node.js 18+ ve npm 9+ gereklidir.

```bash
# Repoyu klonla
git clone https://github.com/VS-57/hesapli-pc-node-js.git
cd hesapli-pc-node-js

# Backend bağımlılıkları
npm install

# Frontend build
cd client
npm install
npm run build
cd ..

# Sunucuyu başlat
npm start
```

Uygulama `http://localhost:3000` adresinde çalışır.

---

## API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/status` | Sunucu durumu, son güncelleme zamanı, ürün sayısı |
| POST | `/api/getProducts` | Filtreli, sıralı ve sayfalı ürün listesi |
| GET | `/api/combined` | Tüm scraperları paralel çalıştırır, `mock.json` günceller |
| GET | `/api/itopya` | İtopya ürünleri |
| GET | `/api/vatan` | Vatan ürünleri |
| GET | `/api/sinerji` | Sinerji ürünleri |
| GET | `/api/pckolik` | PcKolik ürünleri |
| GET | `/api/tebilon` | Tebilon ürünleri |
| GET | `/api/inceHesap` | İnceHesap ürünleri |
| GET | `/api/gencergaming` | Gencer Gaming ürünleri |
| GET | `/api-docs` | Swagger UI |

### POST /api/getProducts

```json
{
  "searchTerm": "ryzen 5",
  "startPrice": 10000,
  "endPrice": 30000,
  "selectedCPUs": ["AMD", "Intel"],
  "selectedGPUs": ["RTX", "RX"],
  "stores": ["vatan", "itopya"],
  "isStocked": true,
  "orderBy": "lowToHigh",
  "page": 1,
  "pageSize": 60
}
```

---

## Proje Yapısı

```
├── index.mjs
├── lib/
│   ├── scraper-utils.mjs   # Ortak yardımcılar: parsePrice, fetchHtml, normalise, batchMap
│   └── scheduler.mjs       # node-cron otomatik güncelleme
├── routes/
│   ├── api.mjs
│   ├── getProducts.mjs     # Filtreli ürün endpoint + in-memory cache
│   ├── combined.mjs        # Tüm scraperları paralel çalıştırır
│   ├── itopya.mjs          # Puppeteer
│   ├── sinerji.mjs         # Puppeteer
│   ├── gamingGen.mjs       # Puppeteer
│   ├── vatan.mjs           # node-fetch + JSDOM
│   ├── pckolik.mjs         # node-fetch + JSDOM
│   ├── tebilon.mjs         # node-fetch + JSDOM
│   ├── inceHesap.mjs       # node-fetch + JSDOM
│   └── gencergaming.mjs    # node-fetch + JSDOM
├── mock.json               # Son scrape sonucu
└── client/                 # React + Vite frontend
```

---

## Veri Güncelleme

Veriler `mock.json` dosyasında saklanır. Manuel olarak `GET /api/combined` isteğiyle veya otomatik olarak her gece 03:00'de (scheduler aracılığıyla) güncellenir.

Son güncelleme bilgisi için:

```
GET /api/status
```

---

## Lisans

MIT
