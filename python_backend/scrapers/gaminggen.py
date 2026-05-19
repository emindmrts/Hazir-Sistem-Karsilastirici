import re
"""
GamingGen scraper - StealthyFetcher
- wait_selector: li.product (pagination degil)
- Concurrent page fetching with Semaphore(5)
"""
import asyncio
from scrapling.fetchers import StealthyFetcher
from .utils import extract_specs_from_list, extract_specs_from_name

STORE = "gamingGen"
BASE_URL = "https://www.gaming.gen.tr/kategori/hazir-sistemler/"
PRODUCT_SEL = "li.product"


def _normalize(text: str) -> str:
    """Collapse all whitespace (including newlines) into a single space."""
    return " ".join(text.split())


def _extract_price(item) -> float:
    """Extract price from WooCommerce .price element (handles <ins><bdi> nesting)."""
    price_el = item.css(".price").first
    if not price_el:
        return 0.0
    # Prefer discounted price inside <ins>
    ins_el = price_el.css("ins").first
    target = ins_el if ins_el else price_el
    # WooCommerce wraps amount in <bdi>
    bdi_el = target.css("bdi").first
    raw_el = bdi_el if bdi_el else target
    try:
        price_text = raw_el.get_all_text() if hasattr(raw_el, "get_all_text") else raw_el.text
    except Exception:
        price_text = ""
    # Remove everything except digits and comma; Turkish format: 120.000,00
    cleaned = re.sub(r"[^\d,]", "", price_text)
    cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def _parse_page_products(page) -> list[dict]:
    products = []
    for item in page.css(PRODUCT_SEL):
        title_el = item.css(".pc-specs-title").first
        name = _normalize(title_el.text) if title_el else "N/A"
        a_el = item.css("a").first
        link = a_el.attrib.get("href") if a_el else None
        img_el = item.css("img").first
        image = None
        if img_el:
            for attr in ["data-src", "data-lazy-src", "src"]:
                val = img_el.attrib.get(attr)
                if val and not val.startswith("data:image"):
                    image = val
                    break
            if not image:
                noscript_img = item.css("noscript img").first
                if noscript_img:
                    image = noscript_img.attrib.get("src")
        price = _extract_price(item)
        spec_items = [
            _normalize(li.get_all_text() if hasattr(li, "get_all_text") else li.text)
            for li in item.css(".pc-specs-list li")
        ]
        specs = extract_specs_from_list(spec_items)

        if name:
            name_specs = extract_specs_from_name(name)
            for k, v in specs.items():
                if v == "N/A" and name_specs.get(k) != "N/A":
                    specs[k] = name_specs[k]


        products.append({"name": name, "price": price, "image": image, "url": link, "store": STORE, "specs": specs})
    return products


async def _fetch_page(url: str) -> list[dict]:
    page = await StealthyFetcher.async_fetch(url, headless=True, network_idle=True,
                                               timeout=90000, wait_selector=PRODUCT_SEL, wait_selector_state="attached")
    return _parse_page_products(page)


async def scrape_all_pages_async() -> list[dict]:
    print(f"[GamingGen] Ilk sayfa: {BASE_URL}", flush=True)
    try:
        first_page = await StealthyFetcher.async_fetch(
            BASE_URL, 
            headless=True, 
            network_idle=True,
            timeout=90000, 
            wait_selector=PRODUCT_SEL, 
            wait_selector_state="attached"
        )
    except Exception as e:
        print(f"[GamingGen] Ilk sayfa hatasi: {e}", flush=True)
        return []

    all_products = _parse_page_products(first_page)
    seen_urls = {p["url"] for p in all_products if p.get("url")}
    
    page_num = 2
    while True:
        print(f"[GamingGen] Sayfa {page_num} basliyor...", flush=True)
        url = f"{BASE_URL}page/{page_num}/"
        batch = []
        for attempt in range(3):
            try:
                batch = await _fetch_page(url)
                if batch:
                    break
            except Exception as e:
                print(f"[GamingGen] Sayfa {page_num} hata (deneme {attempt+1}): {e}", flush=True)
                await asyncio.sleep(2)
                
        if not batch:
            break
            
        new_count = 0
        for p in batch:
            if p["url"] and p["url"] not in seen_urls:
                seen_urls.add(p["url"])
                all_products.append(p)
                new_count += 1
                
        if new_count == 0:
            break
            
        page_num += 1

    print(f"[GamingGen] Toplam {len(all_products)} urun", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    with open("gaminggen_test.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("gaminggen_test.json kaydedildi")


