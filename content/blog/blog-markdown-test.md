---
title: Blog Markdown Test Yazısı
slug: blog-markdown-test
date: 2026-09-05
description: Blog altyapısını test etmek için hazırlanmış örnek yazı. Başlıklar, listeler, kod blokları, tablolar, alıntılar ve linkler test edilir.
tags: test, markdown, geliştirme
---

Bu yazı, blog render motorunun tüm öğelerini test etmek için hazırlanmıştır. İçerik anlamsızdır; amaç görsel doğrulamadır.

## Başlık hiyerarşisi testi

### Üçüncü seviye başlık

**Kalın metin,** *italik metin*, ~~üstü çizili~~, `inline kod` ve [bağlantı](https://www.pckarsilastir.com) örnekleri.

> Bu bir alıntı (blockquote) testidir. Uzun saydığında satırı sarmalı ve sol kenarlık görünmelidir.

## Liste testleri

Sırasız liste:

- Madde bir
- Madde iki
  - Alt madde
- Madde üç

Sıralı liste:

1. İlk adım
2. İkinci adım
3. Üçüncü adım

## Kod bloğu testi

```javascript
// Kod bloğu örneği
function merhaba(isim) {
  console.log(`Merhaba, ${isim}!`)
  return isim.length
}
```

## Tablo testi

| Özellik | Değer | Not |
| --- | --- | --- |
| İşlemci | 6 çekirdek | Oyunlar için ideal |
| RAM | 32 GB | Çift kanal |
| Depolama | 1 TB NVMe | Hızlı açılış |

## Yatay çizgi testi

İlk paragraf.

---

İkinci paragraf.

`pre` içindeki kod satırları ile inline `kod` bileşeni ayrı görünmelidir. Tüm stiller hem açık hem koyu temada kontrol edilmelidir.