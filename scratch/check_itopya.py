import json
from collections import Counter

with open("itopya_test.json", encoding="utf-8") as f:
    data = json.load(f)

# Her sayfada hangi URL'ler var - takip etmek icin index sirasi kullaniyoruz
# 1100 kayit / 5 sayfa = sayfa basi kac urun?
total = len(data)
print(f"Toplam kayit: {total}")
print(f"5 sayfaya bolundugunde: {total/5:.1f} kayit/sayfa")

# URL'lerin ilk 5'i, son 5'i
print("\nIlk 5 kayit URL:")
for p in data[:5]:
    print(f"  {p['url']}")

print("\n220-225 arasi kayitlar (sayfa 2 baslangici?):")
for p in data[218:223]:
    print(f"  [{p['name'][:30]}] {p['url'][:60]}")

# Kac farkli urun var gercekte?
urls = [p["url"] for p in data]
unique = len(set(urls))
none_urls = sum(1 for u in urls if not u)
print(f"\nBenzersiz URL: {unique}")
print(f"URL=None olan: {none_urls}")
