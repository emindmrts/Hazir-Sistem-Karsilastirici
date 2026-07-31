# Frontend

Hazır Sistem Karşılaştırıcı'nın React uygulaması. Vite + TypeScript + Tailwind CSS kullanır.

## Geliştirme

```bash
npm install
npm run dev
```

Dev sunucusu `5173` portunda çalışır ve `/api` isteklerini `http://localhost:3000`'a yönlendirir (kök dizindeki Express sunucusu).

## Build

```bash
npm run build
```

Çıktı `dist/` klasörüne yazılır. Kök sunucu bu klasörü servis eder.

## Önemli dosyalar

- `src/App.tsx` — Routing ve ana sayfa
- `src/components/` — Arayüz bileşenleri (ürün kartı, karşılaştırma, filtreler)
- `src/hooks/use-products.ts` — Ürün verisi yükleme ve filtreleme
- `public/mock.json` — Kök dizindeki `mock.json`'ın kopyası (build öncesi kopyalanır)
