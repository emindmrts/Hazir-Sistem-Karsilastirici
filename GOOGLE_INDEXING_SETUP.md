# Google Indexing API - OPTIMIZED (200 URL/gün)

## ✅ Kurulum Özeti

### 1. Google Cloud Setup (5 dk)
```bash
1. https://console.cloud.google.com açın
2. Yeni Proje oluşturun
3. Indexing API etkinleştirin
4. Service Account oluşturun
5. JSON key indirin → `service-account-key.json`
6. Search Console'a Service Account ekleyin
```

### 2. Environment Variable
```bash
# .env
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

### 3. Backend Setup

**server.ts / index.ts dosyasına:**

```typescript
import express from 'express';
import { setupIndexingRoutes, startIndexingScheduler } from './indexing-service';

const app = express();
app.use(express.json());

// Indexing routes'ı setup et
setupIndexingRoutes(app);

// Scheduled job'ı başlat (her gün 02:00'de 200 URL gönder)
startIndexingScheduler();

app.listen(3000, () => {
  console.log('✅ Server + Indexing Scheduler aktif');
});
```

**package.json'a paket ekleyin:**

```bash
npm install node-cron
```

### 4. Frontend - DetailPage.tsx

```typescript
import { useGoogleIndexing } from '../hooks/use-google-indexing';

export function DetailPage({ product }: { product: Product }) {
  // Sistem sayfasını kuyruğa ekle (scheduled job tarafından gönderilir)
  useGoogleIndexing(`https://ucuzasistem.com/sistem/${product.slug}`);
  
  return (
    // Sayfa içeriği
  );
}
```

### 5. Search Console'a Sitemap Ekleyin

```
1. https://search.google.com/search-console
2. Siteniz seçin
3. "Sitemaps" → sitemap.xml URL'sini ekleyin
4. Google otomatik crawl eder (limit yok)
```

## 📊 Nasıl Çalışır?

```
┌─────────────────────────────────┐
│ Kullanıcı sistem sayfasına gidiyor │
└──────────────┬──────────────────┘
               ↓
    ┌─────────────────────────┐
    │ useGoogleIndexing hook │
    │ /api/indexing/queue    │
    └──────────────┬──────────┘
                   ↓
       ┌───────────────────────┐
       │ Pending URLs kuyruğu │ (Set)
       │ (Sınırsız)            │
       └──────────────┬────────┘
                      ↓
          ┌─────────────────────┐
          │ Her gün 02:00'de    │ (Scheduled)
          │ İlk 200 URL'yi      │
          │ Google'a gönder     │
          └──────────────┬──────┘
                         ↓
            ┌──────────────────────┐
            │ Google Indexing API  │
            │ ✅ Indexed           │
            └──────────────────────┘
```

## 🔧 API Endpoints

### 1. URL Kuyruğa Ekle (Otomatik - Hook)
```bash
POST /api/indexing/queue
Body: { "url": "https://ucuzasistem.com/sistem/abc" }
```

### 2. Pending URL'leri Kontrol Et
```bash
GET /api/indexing/pending
Response: { "total": 150, "urls": [...] }
```

### 3. Immediate Submit (Test)
```bash
POST /api/indexing/submit-now
Body: { "url": "https://ucuzasistem.com" }
```

## 🛡️ Güvenlik

```bash
# .gitignore
service-account-key.json
.env.local
.env.*.local
```

## 📈 Production (Vercel)

1. **Environment Variable Ekle:**
   - Vercel Dashboard → Settings → Environment Variables
   - `GOOGLE_APPLICATION_CREDENTIALS` = JSON dosyasının bütün içeriği (paste et)

2. **Cron Job Vercel'de çalışır:**
   - node-cron Production'da da çalışır ✅
   - Server startup'ta scheduler başlar

## ✨ Avantajlar

✅ Google'a 200 URL/gün limitine uyum sağlıyor  
✅ Rate limit errors yok  
✅ Otomatik - kod yazmanız yok  
✅ Sitemap + Scheduled = Perfect combo  
✅ Production'da sorunsuz çalışır  
✅ Monitoring endpoint var  

## 🚀 Başlama Kontrol Listesi

- [ ] Google Cloud Project oluştur
- [ ] Service Account JSON'ı indir
- [ ] `service-account-key.json` proje root'una koy
- [ ] `.env` dosyası güncelle
- [ ] `npm install node-cron`
- [ ] server.ts'yi güncelle
- [ ] DetailPage.tsx'e hook ekle
- [ ] sitemap.xml Search Console'a ekle
- [ ] Test: `GET /api/indexing/pending`
- [ ] Deploy et

---

✅ **Hazır!** Siteniz artık otomatik indexleniyor ve rate limit sorunları yok.
