# 🚀 Hazır Sistem Karşılaştırıcı (Ucuza Sistem)

[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Scrapers-Python-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

**Hazır Sistem Karşılaştırıcı**, Türkiye'nin önde gelen teknoloji mağazalarındaki (Vatan, İtopya, Sinerji vb.) hazır bilgisayar sistemlerini tek bir çatı altında toplayan, filtreleyen ve en avantajlı fiyatları bulmanızı sağlayan yüksek performanslı bir web uygulamasıdır.

## 📱 Mobil Görünüm
<p align="center">
  <img src="screenshots/mobile.png" width="300" alt="Mobil Arayüz Önizleme">
</p>

---

## ✨Özellikler

- 🔍 **Anlık Ürün Arama:** Binlerce hazır sistem arasında milisaniyeler içinde arama yapın.
- 🎭 **Gelişmiş Filtreleme:** CPU, GPU, Mağaza ve Fiyat aralığına göre hassas filtreleme.
- ⚡ **Hibrit Scraper Mimarisi:** Veri çekme işlemleri Python'un gücüyle, API yönetimi Node.js'in hızıyla gerçekleştirilir.
- 🌙 **Modern UI/UX:** Modern ve Güzel arayüz
- 🕒 **Otomatik Güncelleme:** Her gece 03:00'te otomatik çalışan veri toplama hattı.
- 🛠️ **Donanım Detayları:** RAM, Anakart, Kasa ve PSU gibi detaylı teknik özelliklerin otomatik ayrıştırılması.

---

## 🛠️ TechStack

### **Frontend**
- **Çekirdek:** React 18 + Vite + TypeScript
- **Stil:** Tailwind CSS + Vanilla CSS (Custom Design System)
- **Bileşenler:** shadcn/ui + Radix UI
- **Animasyon:** GSAP (ScrollTrigger)

### **Backend (API Layer)**
- **Runtime:** Node.js (ESM)
- **Framework:** Express.js
- **Araçlar:** Morgan, Swagger UI, node-cron
- **Veri Saklama:** JSON tabanlı performanslı dosya sistemi (In-memory caching ile)

### **Scraper Layer (Python)**
- **Dil:** Python 3.10+
- **Kütüphaneler:** BeautifulSoup4, Requests, Concurrent.futures
- **Mimari:** Paralel çalışan, merkezi bir merkezden yönetilen 10+ farklı mağaza scraper'ı.

---

## 📂 Proje Yapısı

```text
├── client/                # React + Vite Frontend uygulaması
├── python_backend/        # Python tabanlı yüksek performanslı scraperlar
│   ├── scrapers/          # Mağaza bazlı scraper modülleri (Vatan, Itopya vb.)
│   └── run_scrapers.py    # Scraper orkestrasyon betiği
├── routes/                # Node.js API endpointleri
├── lib/                   # Ortak yardımcı fonksiyonlar
├── index.mjs              # Node.js Sunucu giriş noktası
├── mock.json              # Scrape edilmiş normalize veriler
└── vercel.json            # Deployment konfigürasyonu
```

---

##  Locale Kurulum

### **1. Repoyu Klonlayın**
```bash
git clone https://github.com/emindmrts/Hazir-Sistem-Karsilastirici
```

### **2. Frontend Başlatma*
```bash
cd client
npm install
npm run dev
```

### **3. Backend & API Başlatma**
```bash
# Ana dizine dönün
cd ..
npm install
npm start
```

### **4. Scraperları Çalıştırma (Veri Toplama)**
```bash
cd python_backend
pip install -r requirements.txt
python run_scrapers.py
```

---

## 🔗 API Detay

| Metot | Endpoint | Açıklama |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Sistem durumu ve son veri güncelleme zamanı |
| `POST` | `/api/getProducts` | Gelişmiş filtreleme ile ürün listeleme |
| `GET` | `/api/combined` | Manuel veri güncelleme tetikleyicisi |
| `GET` | `/api-docs` | İnteraktif Swagger API dökümantasyonu |

---

## 🏪 Desteklenen Mağazalar

-  **Vatan Bilgisayar**
-  **İtopya**
-  **Sinerji**
-  **PCKolik**
-  **İnceHesap**
-  **Gaming.Gen.TR**
-  **Game Garaj**
-  **Tebilon**

---
## 📄 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakabilirsiniz.
 
 Not: Readme oluşturmak için AI kullandım
---
<p align="center">Made with ❤️ </p>
