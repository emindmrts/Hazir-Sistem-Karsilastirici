"""
InceHesap scraper - StealthyFetcher Version
- StealthyFetcher for dynamic content
- Pagination: /sayfa-X/
- Sequential fetching with early stopping
"""
import re
import sys
import math
import asyncio
import json
from scrapling import Fetcher

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

STORE = "incehesap"
BASE_URL = "https://www.incehesap.com/hazir-sistemler-fiyatlari/"
PRODUCTS_PER_PAGE = 24

def _parse_price(el) -> float:
    # Look for text ending with TL
    text = el.get_all_text()
    m = re.search(r"([\d\.]+)\s*TL", text)
    if m:
        clean = m.group(1).replace(".", "")
        try: return float(clean)
        except: pass
    
    # Fallback to selector
    price_el = el.css("span.text-orange-500").first or el.css(".price").first or el.css("span").first
    if not price_el: return 0.0
    raw = price_el.get_all_text().strip()
    clean = re.sub(r"[^\d,]", "", raw).replace(",", ".")
    if "." in clean:
        parts = clean.split(".")
        if len(parts[-1]) == 3: clean = "".join(parts)
    try: return float(clean)
    except: return 0.0

def _parse_page_products(page) -> list[dict]:
    if not page: return []
    products = []
    
    # 1. Parse Featured/Featured products (a.product) which have JSON
    featured_cards = page.css("a.product")
    for el in featured_cards:
        data = el.attrib.get("data-product")
        if data:
            try:
                obj = json.loads(data)
                name = obj.get("name", "N/A")
                price = float(obj.get("price", 0))
                href = el.attrib.get("href", "")
                url_product = href if href.startswith("http") else f"https://www.incehesap.com{href}"
                img_el = el.css("img").first
                image = (img_el.attrib.get("data-src") or img_el.attrib.get("src")) if img_el else None
                if image and image.startswith("/"): image = f"https://www.incehesap.com{image}"
                
                products.append({"name": name, "price": price, "image": image, "url": url_product, "store": STORE, "specs": {}})
            except: pass

    # 2. Parse Main Grid products (a.aspect-square) which have text
    # The parent of a.aspect-square is the container
    main_cards = page.css("a.aspect-square")
    for link_el in main_cards:
        # We need to find the container div to get the price
        # Based on tests, div.p-1 or looking at parent text works
        # Since we can't easily go up, we'll find the div.p-1 that contains this link
        # Actually, let's use a simpler approach: get the name from title and find price in text
        name = link_el.attrib.get("title", "").strip()
        href = link_el.attrib.get("href", "")
        url_product = href if href.startswith("http") else f"https://www.incehesap.com{href}"
        
        # To get the price, we search for the div that contains this name
        # A better way in scrapling: find all div.p-1 and check if they contain this link's href
        # Or just parse all div.p-1 independently (this is what I'll do)
        pass # We'll do this in the next loop

    # Alternative: Parse all div.p-1 as main cards
    div_cards = page.css("div.p-1")
    for div in div_cards:
        text = div.get_all_text()
        if "TL" in text and ("OEM Paket" in text or "Garanti" in text):
            link = div.css("a").first
            if link:
                href = link.attrib.get("href", "")
                url_product = href if href.startswith("http") else f"https://www.incehesap.com{href}"
                name = link.attrib.get("title", "").strip() or text.split("\n")[0].strip()
                price = _parse_price(div)
                img_el = div.css("img").first
                image = (img_el.attrib.get("data-src") or img_el.attrib.get("src")) if img_el else None
                if image and image.startswith("/"): image = f"https://www.incehesap.com{image}"
                
                # Simple specs from text
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                specs = {"CPU": "N/A", "Motherboard": "N/A", "GPU": "N/A", "RAM": "N/A", "Storage": "N/A"}
                def find(*kws):
                    return next((x for x in lines if any(k.lower() in x.lower() for k in kws)), "N/A")
                specs["CPU"] = find("islemci", "cpu", "ryzen", "core", "intel", "amd")
                specs["Motherboard"] = find("anakart", "mb")
                specs["GPU"] = find("rtx", "gtx", "rx ", "arc")
                specs["RAM"] = find("mhz", "ram", "ddr", "cl")
                specs["Storage"] = find("ssd", "m.2", "nvme", "tb")

                products.append({"name": name, "price": price, "image": image, "url": url_product, "store": STORE, "specs": specs})

    return products

async def scrape_all_pages_async():
    print(f"[{STORE}] Fetching page 1 (Static)...", flush=True)
    fetcher = Fetcher()
    def fetch_sync(url): return fetcher.get(url)
    
    first_page = await asyncio.to_thread(fetch_sync, BASE_URL)
    if not first_page: return []
    
    full_text = first_page.get_all_text().lower()
    total_pages = 1
    m = re.search(r"(\d+)\s+adet\s+ürün\s+listelenmektedir", full_text)
    if m:
        total_count = int(m.group(1))
        total_pages = math.ceil(total_count / PRODUCTS_PER_PAGE)
    
    print(f"[{STORE}] {total_pages} pages found.", flush=True)
    all_products = _parse_page_products(first_page)
    seen_urls = {p["url"] for p in all_products}
    
    if total_pages > 1:
        async def fetch_page_n(n):
            url = f"{BASE_URL}sayfa-{n}/"
            page = await asyncio.to_thread(fetch_sync, url)
            return _parse_page_products(page) if page else []
            
        tasks = [fetch_page_n(i) for i in range(2, total_pages + 1)]
        results = await asyncio.gather(*tasks)
        for r in results:
            for p in r:
                if p["url"] not in seen_urls:
                    seen_urls.add(p["url"])
                    all_products.append(p)
        
    print(f"[{STORE}] Total {len(all_products)} products.", flush=True)
    return all_products

def scrape_all_pages():
    return asyncio.run(scrape_all_pages_async())

if __name__ == "__main__":
    import json
    res = scrape_all_pages()
    with open("incehesap_stealthy.json", "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=2)