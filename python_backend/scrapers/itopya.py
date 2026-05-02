"""
Itopya scraper - Robust & Optimized
- URL pagination: ?pg=X
- StealthyFetcher for dynamic content
- Concurrency for speed
"""
import re
import math
import sys
import asyncio
from scrapling.fetchers import StealthyFetcher

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DOMAIN = "https://www.itopya.com"
BASE_URL    = f"{BASE_DOMAIN}/oem-paketler"
PRODUCTS_PER_PAGE = 20

async def _fetch_page(url: str):
    for attempt in range(2):
        try:
            page = await StealthyFetcher.async_fetch(
                url,
                headless=True,
                wait_until="domcontentloaded",
                timeout=120000,
                wait_selector=".product, .product-card",
                wait_selector_state="attached",
            )
            return page
        except:
            if attempt == 1:
                return await StealthyFetcher.async_fetch(url, headless=True, timeout=120000)
            await asyncio.sleep(5)
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

        # Fiyat
        price_el = el.css(".product-price strong").first or el.css(".product-price").first
        price_text = price_el.get_all_text().strip() if price_el else "0"
        price_clean = re.sub(r"[^\d,]", "", price_text).replace(",", ".")
        try: price = float(price_clean)
        except: price = 0.0

        # Specs
        spec_items = [li.get_all_text().strip() for li in el.css(".product-block-feature li, .advice-system-feature p")]
        specs = {"CPU": "N/A", "Motherboard": "N/A", "GPU": "N/A", "RAM": "N/A", "Storage": "N/A"}
        def find_spec(*kws):
            return next((x for x in spec_items if any(k.lower() in x.lower() for k in kws)), "N/A")
        specs["CPU"] = find_spec("islemci", "cpu", "ryzen", "core", "intel", "amd")
        specs["Motherboard"] = find_spec("anakart", "mb")
        specs["GPU"] = find_spec("rtx", "gtx", "rx ", "arc", "radeon")
        specs["RAM"] = find_spec("mhz", "ram", "ddr", "cl")
        specs["Storage"] = find_spec("ssd", "m.2", "nvme", "tb")

        products.append({"name": name, "price": price, "image": image, "url": link, "store": "itopya", "specs": specs})
    return products

async def scrape_all_pages_async() -> list[dict]:
    print(f"[Itopya] Fetching page 1...", flush=True)
    first_page = await _fetch_page(BASE_URL)
    if not first_page: return []

    all_products = _parse_products(first_page)
    seen_urls = {p["url"] for p in all_products}
    seen_names = {p["name"] for p in all_products}
    
    # Try fetching pages with ?pg= parameter - fetch up to 20 pages
    total_pages = 20
    
    for page_num in range(2, total_pages + 1):
        url = f"{BASE_URL}?pg={page_num}"
        page = await _fetch_page(url)
        batch = _parse_products(page)
        
        if not batch:
            print(f"[Itopya] Page {page_num} empty, stopping.", flush=True)
            break
            
        new_count = 0
        for p in batch:
            if p["url"] not in seen_urls:
                seen_urls.add(p["url"])
                seen_names.add(p["name"])
                all_products.append(p)
                new_count += 1
        
        print(f"[Itopya] Page {page_num}: {len(batch)} products ({new_count} new).", flush=True)
        
        # If no new products after a few pages, stop early
        if new_count == 0 and page_num > 3:
            print(f"[Itopya] No new products on page {page_num}, stopping.", flush=True)
            break

    print(f"[Itopya] Total {len(all_products)} products fetched.", flush=True)
    return all_products

def scrape_all_pages():
    return asyncio.run(scrape_all_pages_async())

if __name__ == "__main__":
    res = scrape_all_pages()
    print(f"Total: {len(res)}")
