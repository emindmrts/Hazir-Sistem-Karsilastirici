# Hazır Sistem Karşılaştırıcı

Türkiye'deki teknoloji mağazalarının hazır bilgisayar sistemlerini tek yerden toplar, filtrelemenizi ve fiyatları karşılaştırmanızı sağlar. Vatan, İtopya, Sinerji, PCKolik ve daha fazla mağaza düzenli olarak taranır.

## Nasıl çalışıyor

Üç katmanlı bir yapı var:

- **Python scraper'lar** mağaza sitelerinden ürün, fiyat ve donanım bilgilerini toplar.
- **Node.js API** bu veriyi web uygulamasına sunar.
- **React frontend** aramayı, filtrelemeyi ve karşılaştırmayı yapar.

Veri her gece 03:00'te otomatik güncellenir. Ayrıca `POST /api/combined` ile elle de tetiklenebilir.

## Özellikler

- Ürün adı, işlemci ve ekran kartı üzerinde anlık arama
- CPU, GPU, mağaza, fiyat aralığı ve stok durumu filtreleri
- Fiyat/performans (F/P) puanı ve akıllı sıralama
- Detay sayfasında işlemci, anakart, kasa, PSU ve soğutucu bilgileri
- 4 ürüne kadar yan yana karşılaştırma
- Karanlık/aydınlık tema

## Teknoloji

| Katman | Teknolojiler |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, Radix UI, GSAP |
| API | Node.js, Express, node-cron, Swagger |
| Scraper | Python, Scrapling |

## Proje yapısı

```text
├── client/            # React + Vite frontend
│   ├── src/components # Arayüz bileşenleri
│   └── public/        # Statik dosyalar (mock.json dahil)
├── python_backend/    # Python scraper'lar
│   ├── scrapers/      # Mağaza başına bir modül
│   ├── run_all.py     # Tüm scraper'ları çalıştırır, mock.json üretir
│   └── requirements.txt
├── routes/            # API endpoint'leri
├── lib/               # Ortak yardımcılar (scheduler dahil)
├── index.mjs          # Express sunucu giriş noktası
└── mock.json          # Güncel ürün verisi
```

## Kurulum

### 1. Bağımlılıkları kurun

```bash
npm install
cd client && npm install
cd ../python_backend && pip install -r requirements.txt
```

### 2. Veriyi toplayın

```bash
cd python_backend
python run_all.py
```

Bu, kök dizindeki `mock.json`'ı günceller.

### 3. Sunucuyu başlatın

```bash
npm start
```

Sunucu `http://localhost:3000` üzerinde çalışır. Statik frontend'i ve `/api` uç noktalarını birlikte sunar.

### 4. Frontend'i geliştirirken

```bash
cd client
npm run dev
```

Vite dev sunucusu `5173` portunda açar ve API isteklerini `3000`'e yönlendirir.

## API

| Metot | Uç nokta | Açıklama |
| --- | --- | --- |
| `GET` | `/api/status` | Sistem durumu ve son güncelleme zamanı |
| `POST` | `/api/getProducts` | Filtreli ürün listesi |
| `POST` | `/api/combined` | Scraper'ları çalıştırıp veriyi günceller |
| `GET` | `/api-docs` | Swagger dokümantasyonu |

## Mağazalar

- Vatan Bilgisayar
- İtopya
- Sinerji
- PCKolik
- İncehesap
- Gaming.Gen.TR
- Game Garaj
- Tebilon

## Notlar

- Bazı mağazalar kasa/PSU/soğutucu bilgisi vermediği için bu alanlar o ürünlerde "Belirtilmemiş" olarak görünür.
- F/P puanı deneysel bir referanstır, tek başına satın alma kararı için kullanılmamalıdır.
- Scraper'lar siteden siteye değişen HTML yapılarına bağlıdır; mağaza düzeni değişirse ilgili scraper'ın güncellenmesi gerekebilir.
