"""
Itopya scraper - Robust & Optimized
- URL pagination: ?pg=X
- Fetcher for fast fetching
- Concurrency for speed
"""
import re
import math
import sys
import asyncio
from scrapling import Fetcher
from .utils import extract_specs_from_list

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DOMAIN = "https://www.itopya.com"
BASE_URL    = f"{BASE_DOMAIN}/oem-paketler"
PRODUCTS_PER_PAGE = 20

async def _fetch_page(url: str):
    def fetch():
        fetcher = Fetcher()
        return fetcher.get(url, stealthy_headers=True)

    for attempt in range(2):
        try:
            page = await asyncio.to_thread(fetch)
            if page and (page.css(".product") or page.css(".product-card")):
                return page
        except Exception as e:
            print(f"[Itopya] Error fetching {url}: {e}")
        await asyncio.sleep(2)
    return None

def _parse_products(page) -> list[dict]:
    if not page: return []
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

        products.append({"name": name, "price": price, "image": image, "url": link, "store": "itopya", "specs": specs})
    return products

async def scrape_all_pages_async() -> list[dict]:
    print(f"[Itopya] Fetching page 1...", flush=True)
    first_page = await _fetch_page(BASE_URL)
    if not first_page: return []

    all_products = _parse_products(first_page)
    seen_urls = {p["url"] for p in all_products}
    
    total_pages = 100
    for page_num in range(2, total_pages + 1):
        url = f"{BASE_URL}?pg={page_num}"
        page = await _fetch_page(url)
        batch = _parse_products(page)
        
        if not batch:
            break
            
        new_count = 0
        for p in batch:
            if p["url"] not in seen_urls:
                seen_urls.add(p["url"])
                all_products.append(p)
                new_count += 1
        
        print(f"[Itopya] Page {page_num}: {len(batch)} products ({new_count} new).", flush=True)
        if new_count == 0 and page_num > 3:
            break

    print(f"[Itopya] Total {len(all_products)} products fetched.", flush=True)
    return all_products

def scrape_all_pages():
    return asyncio.run(scrape_all_pages_async())

if __name__ == "__main__":
    res = scrape_all_pages()
    print(f"Total: {len(res)}")
