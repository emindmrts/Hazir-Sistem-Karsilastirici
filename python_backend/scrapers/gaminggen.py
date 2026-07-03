import re
import asyncio
from scrapling import Fetcher
from .utils import (
    extract_specs_from_list,
    extract_specs_from_name,
    extract_specs_from_attributes,
    merge_specs,
    cacheable_specs,
    load_detail_cache,
    save_detail_cache,
)

STORE = "gamingGen"
BASE_URL = "https://www.gaming.gen.tr/kategori/hazir-sistemler/"
PRODUCT_SEL = "li.product"


def _normalize(text: str) -> str:
    return " ".join(text.split())


def _extract_price(item) -> float:
    price_el = item.css(".price").first
    if not price_el:
        return 0.0
    ins_el = price_el.css("ins").first
    target = ins_el if ins_el else price_el
    bdi_el = target.css("bdi").first
    raw_el = bdi_el if bdi_el else target
    try:
        price_text = raw_el.get_all_text() if hasattr(raw_el, "get_all_text") else raw_el.text
    except Exception:
        price_text = ""
    cleaned = re.sub(r"[^\d,]", "", price_text)
    cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def _parse_page_products(page) -> list[dict]:
    products = []
    if not page:
        return products
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


def _parse_detail_attrs(page) -> dict:
    """Read the product detail attribute table (Case/PSU/Cooler live here, not on
    the listing card)."""
    if not page:
        return {}
    attrs = {}
    for row in page.css("table.shop_attributes tr"):
        th = row.css("th").first
        td = row.css("td").first
        if not th or not td:
            continue
        label = " ".join(th.get_all_text().split())
        value = " ".join(td.get_all_text().split())
        if label and value:
            attrs[label] = value
    return attrs


async def _fetch_product_details(product: dict, fetcher_instance, cache=None) -> dict:
    specs = product["specs"]
    if specs.get("PSU") != "N/A" and specs.get("Cooler") != "N/A" and specs.get("Case") != "N/A":
        return product
    url = product.get("url")
    if not url:
        return product

    # Cached detail specs for this URL — skip the network round-trip.
    if cache is not None and url in cache:
        merge_specs(product["specs"], cache[url])
        return product

    def sync_fetch():
        try:
            return fetcher_instance.get(url)
        except Exception:
            return None

    for attempt in range(3):
        page = await asyncio.to_thread(sync_fetch)
        if not page:
            await asyncio.sleep(1 + attempt)
            continue
        if getattr(page, "status_code", 200) == 429:
            await asyncio.sleep(4 + attempt * 4)
            continue
        attrs = _parse_detail_attrs(page)
        if attrs:
            detail_specs = extract_specs_from_attributes(attrs)
            merge_specs(product["specs"], detail_specs)
            if cache is not None:
                cache[url] = cacheable_specs(detail_specs)
        break
    return product


async def scrape_all_pages_async() -> list[dict]:
    print(f"[GamingGen] Ilk sayfa: {BASE_URL}", flush=True)
    fetcher = Fetcher()

    def fetch_sync(url):
        try:
            return fetcher.get(url)
        except Exception as e:
            print(f"[GamingGen] Fetch hatasi: {e}", flush=True)
            return None

    first_page = await asyncio.to_thread(fetch_sync, BASE_URL)
    if not first_page:
        print("[GamingGen] Ilk sayfa hatasi", flush=True)
        return []

    all_products = _parse_page_products(first_page)
    seen_urls = {p["url"] for p in all_products if p.get("url")}
    print(f"[GamingGen] Sayfa 1: {len(all_products)} urun", flush=True)
    
    page_num = 2
    while True:
        url = f"{BASE_URL}page/{page_num}/"
        batch = []
        for attempt in range(3):
            try:
                page = await asyncio.to_thread(fetch_sync, url)
                batch = _parse_page_products(page)
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
                
        print(f"[GamingGen] Sayfa {page_num}: {new_count} yeni urun", flush=True)
        if new_count == 0:
            break
            
        page_num += 1

    cache = load_detail_cache()
    cached = sum(1 for p in all_products if p.get("url") in cache)
    print(f"[GamingGen] {len(all_products)} urun icin detay cekiliyor "
          f"(PSU/Sogutucu, {cached} onbellekten)...", flush=True)
    detail_sem = asyncio.Semaphore(12)

    async def fetch_detail_with_sem(prod):
        async with detail_sem:
            was_cached = prod.get("url") in cache
            res = await _fetch_product_details(prod, fetcher, cache)
            if not was_cached:
                await asyncio.sleep(0.1)
            return res

    all_products = await asyncio.gather(*[fetch_detail_with_sem(p) for p in all_products])
    save_detail_cache(cache)

    print(f"[GamingGen] Toplam {len(all_products)} urun", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    print(f"Bitti: {len(products)} urun.")



