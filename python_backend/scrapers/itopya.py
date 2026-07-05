"""
Itopya scraper - Hyper-Fast Version (Optimized)
- Uses ?pg=100 to fetch ALL products in a single request instantly!
- No need for complex pagination logic anymore!
- Fetcher configured for speed
"""
import re
import asyncio
import sys
from scrapling import Fetcher
from .utils import extract_specs_from_list, extract_specs_from_name

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DOMAIN = "https://www.itopya.com"
# By using pg=100 (or any high number), Itopya returns ALL items cumulatively in one go!
BASE_URL    = f"{BASE_DOMAIN}/oem-paketler?pg=100"

async def scrape_all_pages_async() -> list[dict]:
    print(f"[Itopya] Fetching all products in a single request (?pg=100)...", flush=True)
    
    def fetch():
        fetcher = Fetcher()
        return fetcher.get(BASE_URL)

    page = None
    for attempt in range(2):
        try:
            page = await asyncio.to_thread(fetch)
            if page and (page.css(".product") or page.css(".product-card")):
                break
        except Exception as e:
            print(f"[Itopya] Error fetching {BASE_URL}: {e}")
        await asyncio.sleep(2)

    if not page:
        print("[Itopya] Failed to fetch products.", flush=True)
        return []

    products = []
    cards = page.css(".product") or page.css(".product-card")
    
    for el in cards:
        # Link & Name
        link_el = el.css(".product-block-top h1 a").first or el.css("a").first
        if not link_el: continue
        
        name = link_el.get_all_text().strip()
        href = link_el.attrib.get("href")
        if not href: continue
        link = href if href.startswith("http") else f"{BASE_DOMAIN}{href}"

        # Resim
        img_el = el.css("img").first
        image = (img_el.attrib.get("data-src") or img_el.attrib.get("src")) if img_el else None
        if image and image.startswith("/"): image = f"{BASE_DOMAIN}{image}"

        # Fiyat
        price_el = el.css(".product-price strong").first or el.css(".product-price").first
        price_text = price_el.get_all_text().strip() if price_el else "0"
        price_clean = re.sub(r"[^\d,]", "", price_text).replace(",", ".")
        try: price = float(price_clean)
        except: price = 0.0

        # Specs - Itopya has specific classes for each icon
        spec_items = []
        icon_map = {
            "islemci": "CPU",
            "anakart": "Motherboard",
            "ekran-karti": "GPU",
            "bellek": "RAM",
            "ssd": "Storage",
            "kasa": "Case",
            "guc-kaynagi": "PSU",
            "sogutucu": "Cooler"
        }
        
        specs = {"CPU": "N/A", "Motherboard": "N/A", "GPU": "N/A", "RAM": "N/A", "Storage": "N/A", "Case": "N/A", "PSU": "N/A", "Cooler": "N/A"}
        
        features = el.css(".product-block-feature li, .advice-system-feature p")
        for feat in features:
            txt = feat.get_all_text().strip()
            found_by_icon = False
            for icon_key, spec_key in icon_map.items():
                if feat.css(f".itopya-{icon_key}").first:
                    specs[spec_key] = txt
                    found_by_icon = True
                    break
            
            if not found_by_icon:
                spec_items.append(txt)
        
        extra_specs = extract_specs_from_list(spec_items)
        for k, v in specs.items():
            if v == "N/A" and extra_specs.get(k) != "N/A":
                specs[k] = extra_specs[k]
        
        # Fallback to name/URL-based extraction for remaining N/A fields.
        # The display name is often just a model code ("PHOENIX-9060XT V3") but
        # the URL slug carries the full spec string, so feed both.
        if name:
            name_specs = extract_specs_from_name(f"{name} {link}")
            for k, v in specs.items():
                if v == "N/A" and name_specs.get(k) != "N/A":
                    specs[k] = name_specs[k]

        # itopya "LITE" paketler: urun adinda "LITE" ve URL'de "lite-paket"
        # gecen OEM paketlerde RAM ve SSD dahil DEGILDIR (kullanici opsiyonel
        # ekler).  Bu urunlerde name-based extraction URL'deki GPU VRAM
        # ("16gb", "12gb", "8gb") degerini Storage'a yanlislikla yazabilir;
        # bu yuzden LITE paketlerde RAM ve Storage her halukarda "dahil degil"
        # olarak isaretlenir ki UI'da GPU VRAM'i RAM/Storage sanilmasin.
        slug = (link or "").lower()
        is_lite = "lite-paket" in slug or ("lite-" in slug and "lite" in name.lower())
        if is_lite:
            specs["RAM"] = "Pakete dahil değil"
            specs["Storage"] = "Pakete dahil değil"

        products.append({"name": name, "price": price, "image": image, "url": link, "store": "itopya", "specs": specs})

    # Removing duplicates if any exist
    unique_products = []
    seen = set()
    for p in products:
        if p["url"] not in seen:
            seen.add(p["url"])
            unique_products.append(p)

    print(f"[Itopya] Total {len(unique_products)} products fetched instantly.", flush=True)
    return unique_products

def scrape_all_pages():
    return asyncio.run(scrape_all_pages_async())

if __name__ == "__main__":
    res = scrape_all_pages()
    print(f"Total: {len(res)}")
