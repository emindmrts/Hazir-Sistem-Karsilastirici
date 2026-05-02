"""
Vatan Bilgisayar scraper - Hyper-Fast Version (Static)
- Switched to Fetcher (Static) for 10x speed boost
- Parallelized page fetching
"""
import re
import math
import sys
import asyncio
from scrapling import Fetcher

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

STORE = "vatan"
BASE_URL = "https://www.vatanbilgisayar.com/oem-paketler/"
PRODUCTS_PER_PAGE = 24

def _parse_price(el) -> float:
    price_el = el.css(".product-list__price").first
    if not price_el: return 0.0
    raw = price_el.get_all_text().strip()
    # Remove everything except digits, comma and dot
    clean = re.sub(r"[^\d,\.]", "", raw)
    if not clean: return 0.0
    # If both , and . exist, assume . is thousand separator and , is decimal
    if "," in clean and "." in clean:
        clean = clean.replace(".", "").replace(",", ".")
    elif "," in clean: # Only comma, assume it's decimal
        clean = clean.replace(",", ".")
    elif "." in clean: # Only dot, could be thousand separator or decimal
        parts = clean.split(".")
        if len(parts[-1]) == 3: # Thousand separator
            clean = clean.replace(".", "")
    try: return float(clean)
    except: return 0.0

def _parse_page_products(page) -> list[dict]:
    products = []
    cards = page.css(".product-list")
    for el in cards:
        # Filter: Only main products have .product-list-link
        link_el = el.css("a.product-list-link").first
        if not link_el: continue
        href = link_el.attrib.get("href", "")
        url_product = href if href.startswith("http") else f"https://www.vatanbilgisayar.com{href}"
        name_el = el.css(".product-list__product-name").first or el.css("h3").first
        name = name_el.get_all_text().strip() if name_el else "N/A"
        price = _parse_price(el)
        img_el = el.css("img.lazyimg").first or el.css("img").first
        image = (img_el.attrib.get("data-src") or img_el.attrib.get("src")) if img_el else None
        
        # Specs
        spec_items = [p.get_all_text().strip() for p in el.css(".productlist_spec ul li p")]
        specs = {"CPU": "N/A", "Motherboard": "N/A", "GPU": "N/A", "RAM": "N/A", "Storage": "N/A"}
        if spec_items:
            def find(*kws):
                return next((x for x in spec_items if any(k.lower() in x.lower() for k in kws)), "N/A")
            specs["CPU"] = find("islemci", "cpu", "ryzen", "core", "intel", "amd")
            specs["Motherboard"] = find("anakart", "mb")
            specs["GPU"] = find("rtx", "gtx", "rx ", "arc")
            specs["RAM"] = find("mhz", "ram", "ddr", "cl")
            specs["Storage"] = find("ssd", "m.2", "nvme", "tb")

        products.append({"name": name, "price": price, "image": image, "url": url_product, "store": STORE, "specs": specs})
    return products

async def scrape_all_pages_async() -> list[dict]:
    print(f"[{STORE}] Fetching page 1 (Static)...", flush=True)
    fetcher = Fetcher()
    
    def fetch_sync(url): return fetcher.get(url)
    
    first_page = await asyncio.to_thread(fetch_sync, BASE_URL)
    if not first_page: return []
    
    full_text = first_page.get_all_text().lower()
    total_pages = 1
    # Vatan usually shows total count like "286 adet ürün bulundu"
    m = re.search(r"(\d+)\s+adet\s+ürün\s+bulundu", full_text)
    if m:
        total_count = int(m.group(1))
        total_pages = math.ceil(total_count / PRODUCTS_PER_PAGE)
    else:
        # Fallback to old selector if regex fails
        count_el = first_page.css(".wrapper-product--count").first
        if count_el:
            text = count_el.get_all_text()
            m2 = re.search(r"(\d+)", text.replace(".", ""))
            if m2:
                total_pages = math.ceil(int(m2.group(1)) / PRODUCTS_PER_PAGE)

    print(f"[{STORE}] {total_pages} pages found.", flush=True)
    all_products = _parse_page_products(first_page)
    
    if total_pages > 1:
        async def fetch_page_n(n):
            url = f"{BASE_URL}?page={n}"
            page = await asyncio.to_thread(fetch_sync, url)
            return _parse_page_products(page) if page else []
            
        tasks = [fetch_page_n(i) for i in range(2, total_pages + 1)]
        results = await asyncio.gather(*tasks)
        for r in results: all_products.extend(r)
        
    print(f"[{STORE}] Total {len(all_products)} products.", flush=True)
    return all_products

def scrape_all_pages():
    return asyncio.run(scrape_all_pages_async())

if __name__ == "__main__":
    products = scrape_all_pages()
    print(f"Finished: {len(products)} products.")
