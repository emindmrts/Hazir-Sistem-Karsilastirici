"""
GameGaraj scraper — Scrapling Fetcher (static HTML).
Detail page fetch eklenmistir: listing'de olmayan Case/PSU/Cooler
detay sayfasindan cekilir.  Hiz icin cache kullanilir.
"""
import re
import asyncio
from scrapling import Fetcher
from .utils import (
    extract_specs_from_list,
    extract_specs_from_name,
    extract_specs_from_table,
    merge_specs,
    cacheable_specs,
    load_detail_cache,
    save_detail_cache,
)

STORE = "gamegaraj"
BASE_URL = "https://www.gamegaraj.com/oem-paketler/"
SITE = "https://www.gamegaraj.com"


def _parse_price(card) -> float:
    price_el = card.css("p.text-3xl.font-extrabold").first
    if not price_el:
        return 0.0
    raw = price_el.text.strip().replace(".", "").replace(",", ".")
    raw = re.sub(r"[^\d.]", "", raw)
    try:
        return float(raw)
    except ValueError:
        return 0.0


def _parse_products(page) -> list[dict]:
    products = []
    for card in page.css("div[data-product-id]"):
        title_el = card.css("a.text-xl.font-semibold.text-gray-900").first
        name = title_el.get_all_text().strip() if title_el else "N/A"
        href = title_el.attrib.get("href", "") if title_el else ""
        link = f"{SITE}{href}" if href and not href.startswith("http") else href

        # Listing card'inda gorsel lazy-load edilir: <img src="preload-product.jpg"
        # data-src="gercek-gorsel"> veya <source data-srcset="...">.  Placeholder'ı
        # atlayip gercek urun gorselini al.
        image = None
        img_el = (card.css("picture img").first) or (card.css("img").first)
        if img_el:
            for attr in ("data-src", "data-lazy-src", "src"):
                val = img_el.attrib.get(attr, "")
                if val and "preload-product" not in val and val.startswith("http"):
                    image = val
                    break
            # <img data-src> yoksa <source data-srcset> ilk URL'ini dene
            if not image:
                for source in card.css("picture source"):
                    ds = source.attrib.get("data-srcset", "") or source.attrib.get("srcset", "")
                    if ds and "preload-product" not in ds:
                        image = ds.split(",")[0].strip().split(" ")[0]
                        break

        price = _parse_price(card)

        spec_items = [(li.get_all_text() if hasattr(li, 'get_all_text') else li.text).strip()
                      for li in card.css("ul.list-disc li")]
        specs = extract_specs_from_list(spec_items)

        if name:
            name_specs = extract_specs_from_name(f"{name} {link}")
            for k, v in specs.items():
                if v == "N/A" and name_specs.get(k) != "N/A":
                    specs[k] = name_specs[k]

        products.append({
            "name": name, "price": price, "image": image,
            "url": link, "store": STORE, "specs": specs,
        })
    return products


def _parse_detail_rows(page) -> list[tuple[str, str]]:
    """gamegaraj detail table: each row is a single cell "Label: Value"."""
    rows = []
    if not page:
        return rows
    for tr in page.css("table tr"):
        text = (tr.get_all_text() if hasattr(tr, "get_all_text") else tr.text).strip()
        if ":" in text:
            label, _, value = text.partition(":")
            rows.append((label.strip(), value.strip()))
    return rows


async def _fetch_product_details(product: dict, fetcher, cache=None) -> dict:
    specs = product["specs"]
    # Detail page yalnizca eksik alanlar icin gerekli.
    if all(specs.get(k) != "N/A" for k in ("Case", "PSU", "Cooler", "Motherboard")):
        return product
    url = product.get("url")
    if not url:
        return product

    if cache is not None and url in cache:
        merge_specs(specs, cache[url])
        return product

    def sync_fetch():
        try:
            return fetcher.get(url)
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
        rows = _parse_detail_rows(page)
        if rows:
            detail = extract_specs_from_table(rows)
            merge_specs(specs, detail)
            if cache is not None:
                cache[url] = cacheable_specs(detail)
        break
    return product


async def scrape_all_pages_async() -> list[dict]:
    print(f"[GameGaraj] Ilk sayfa: {BASE_URL}", flush=True)
    fetcher = Fetcher()

    def fetch_sync(url):
        try:
            return fetcher.get(url)
        except Exception as e:
            print(f"[GameGaraj] Fetch hatasi: {e}", flush=True)
            return None

    all_products: list[dict] = []
    seen_urls: set[str] = set()
    page_num = 1

    while True:
        url = f"{BASE_URL}?page={page_num}" if page_num > 1 else BASE_URL
        page = await asyncio.to_thread(fetch_sync, url)
        if not page:
            break
        batch = _parse_products(page)
        if not batch:
            break
        new = 0
        for p in batch:
            if p["url"] and p["url"] not in seen_urls:
                seen_urls.add(p["url"])
                all_products.append(p)
                new += 1
        print(f"[GameGaraj] Sayfa {page_num}: {new} yeni urun", flush=True)
        if new == 0:
            break
        page_num += 1

    cache = load_detail_cache()
    cached = sum(1 for p in all_products if p.get("url") in cache)
    missing = sum(1 for p in all_products
                  if any(p["specs"].get(k) == "N/A"
                         for k in ("Case", "PSU", "Cooler", "Motherboard"))
                  and p.get("url") not in cache)
    print(f"[GameGaraj] {len(all_products)} urun · {cached} onbellekten · "
          f"{missing} icin detay cekiliyor...", flush=True)

    sem = asyncio.Semaphore(8)

    async def fetch_detail_with_sem(prod):
        async with sem:
            was_cached = prod.get("url") in cache
            res = await _fetch_product_details(prod, fetcher, cache)
            if not was_cached:
                await asyncio.sleep(0.1)
            return res

    all_products = await asyncio.gather(*[fetch_detail_with_sem(p) for p in all_products])
    save_detail_cache(cache)

    print(f"[GameGaraj] Toplam {len(all_products)} urun", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    print(f"Bitti: {len(products)} urun.")
