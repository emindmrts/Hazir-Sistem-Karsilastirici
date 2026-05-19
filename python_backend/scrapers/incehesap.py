"""
InceHesap scraper
- Pagination: /sayfa-X/
- Iterating [data-product] 
"""
import re
import sys
import asyncio
import json
from scrapling import Fetcher
from .utils import extract_specs_from_name

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

STORE = "incehesap"
BASE_URL = "https://www.incehesap.com/hazir-sistemler-fiyatlari/"

def _parse_page_products(page) -> list[dict]:
    if not page: return []
    products = []
    
    # We select all a[data-product] elements. This gets exactly the products
    cards = page.css("a[data-product]")
    for el in cards:
        href = el.attrib.get("href", "")
        if not href or "-oem-paket-fiyati-" not in href:
            continue
        href = href.split("#")[0].split("?")[0]
        url_product = href if href.startswith("http") else f"https://www.incehesap.com{href}"
        
        img_el = el.css("img").first
        image = (img_el.attrib.get("data-src") or img_el.attrib.get("src")) if img_el else None
        if image and image.startswith("/"): image = f"https://www.incehesap.com{image}"
        
        data = el.attrib.get("data-product")
        if not data:
            continue
            
        try:
            obj = json.loads(data)
            category = obj.get("category", "")
            name = obj.get("name", "N/A")
            # Skip non-PC categories
            if "OEM Paket" not in category and "OEM Paket" not in name:
                continue
            price = float(obj.get("price", 0))
        except:
            continue
            
        specs = extract_specs_from_name(name)
        if specs.get("CPU") == "N/A" and specs.get("GPU") == "N/A":
            continue
            
        products.append({"name": name, "price": price, "image": image, "url": url_product, "store": STORE, "specs": specs})

    return products

async def scrape_all_pages_async():
    print(f"[{STORE}] Fetching OEM Paketler...", flush=True)
    fetcher = Fetcher()
    def fetch_sync(url): return fetcher.get(url)
    
    all_products = []
    seen_urls = set()
    
    for page_num in range(1, 20):
        url = BASE_URL if page_num == 1 else f"{BASE_URL}sayfa-{page_num}/"
        page = await asyncio.to_thread(fetch_sync, url)
        if not page: break
        
        batch = _parse_page_products(page)
        if not batch: break
        
        new_count = 0
        for p in batch:
            if p["url"] not in seen_urls:
                seen_urls.add(p["url"])
                all_products.append(p)
                new_count += 1
                
        print(f"[{STORE}] Page {page_num}: {new_count} new products found", flush=True)
        if new_count == 0:
            break
            
    print(f"[{STORE}] Total {len(all_products)} products.", flush=True)
    return all_products

def scrape_all_pages():
    return asyncio.run(scrape_all_pages_async())

if __name__ == "__main__":
    res = scrape_all_pages()
    with open("incehesap_stealthy.json", "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=2)