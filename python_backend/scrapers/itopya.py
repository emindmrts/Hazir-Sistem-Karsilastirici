"""
Itopya scraper - Hyper-Fast Version (Optimized)
- Uses ?pg=100 to fetch ALL products in a single request instantly!
- Detail pages are fetched concurrently to extract Case/PSU/Cooler.
- Fetcher configured for speed
"""
import re
import json
import asyncio
import sys
import os
from scrapling import Fetcher
from .utils import extract_specs_from_list, extract_specs_from_name

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DOMAIN = "https://www.itopya.com"
# By using pg=100 (or any high number), Itopya returns ALL items cumulatively in one go!
BASE_URL    = f"{BASE_DOMAIN}/oem-paketler?pg=100"
DETAIL_CACHE_PATH = os.path.join(os.path.dirname(__file__), ".itopya_detail_cache.json")


def _load_detail_cache() -> dict:
    try:
        with open(DETAIL_CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_detail_cache(cache: dict):
    with open(DETAIL_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def _psu_from_case(case_name: str) -> str:
    """Extract PSU string from a case product name.

    Most Itopya cases include a built-in PSU with wattage and 80+ rating,
    e.g. "NZXT H5 Flow Edition 750W 80+ Bronze USB 3.2 USB-C Beyaz E-ATX Mid Tower Kasa".
    Some list a separate PSU explicitly: "+ FSP HD2-750W GEN5 PSU".
    """
    if not case_name:
        return "N/A"
    m = re.search(
        r'(\d{3,4}\s*W(?:\s*80\s*\+\s*(?:Bronze|Gold|Platinum|Titanium|White)?)?)',
        case_name, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # Fallback: look for explicit PSU mention
    m = re.search(r'\+\s*(.+?PSU)', case_name, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return "N/A"


def _parse_detail_sections(body) -> dict[str, str]:
    """Parse h2/h3 section structure of an Itopya detail page.

    Returns a dict with keys 'Case', 'PSU', 'Cooler' (or 'N/A' if not found).
    The first <h3> under each relevant <h2> is taken as the default option.
    """
    result = {"Case": "N/A", "PSU": "N/A", "Cooler": "N/A"}
    headings = body.css("h2.eseoContainerH2Font, h3.eseoContainerH3Font")
    current_section = None
    for h in headings:
        txt = h.get_all_text().strip()
        if h.tag == "h2":
            current_section = txt
            # If we encounter Powersupply section, mark PSU for the first h3
        elif h.tag == "h3" and current_section:
            if "Bilgisayar Kasaları" in current_section and result["Case"] == "N/A":
                result["Case"] = txt
                # Only set PSU from case name if no separate PSU section found yet
                if result["PSU"] == "N/A":
                    result["PSU"] = _psu_from_case(txt)
            elif "İşlemci Soğutucular" in current_section and result["Cooler"] == "N/A":
                result["Cooler"] = txt
            elif any(w in current_section.lower() for w in ["powersupply", "güç kaynağı", "guc kaynagi", "psu"]) and result["PSU"] == "N/A":
                result["PSU"] = txt
    return result


async def _fetch_detail_async(url: str, sem: asyncio.Semaphore,
                               cache: dict) -> dict[str, str]:
    if url in cache:
        return cache[url]
    async with sem:
        for attempt in range(3):
            def fetch():
                f = Fetcher()
                return f.get(url)
            try:
                resp = await asyncio.to_thread(fetch)
                if resp.status == 429:
                    wait = 2 ** attempt
                    await asyncio.sleep(wait)
                    continue
                body = resp.css("body").first
                if body:
                    result = _parse_detail_sections(body)
                    if any(v != "N/A" for v in result.values()):
                        cache[url] = result
                    return result
                return {"Case": "N/A", "PSU": "N/A", "Cooler": "N/A"}
            except Exception as e:
                if attempt == 2:
                    print(f"  [Itopya] Detail fetch error: {url[:60]}... {e}")
                    return {"Case": "N/A", "PSU": "N/A", "Cooler": "N/A"}
                await asyncio.sleep(1)
        return {"Case": "N/A", "PSU": "N/A", "Cooler": "N/A"}


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
        link_el = el.css(".product-block-top h1 a").first or el.css("a").first
        if not link_el: continue

        name = link_el.get_all_text().strip()
        href = link_el.attrib.get("href")
        if not href: continue
        link = href if href.startswith("http") else f"{BASE_DOMAIN}{href}"

        img_el = el.css("img").first
        image = (img_el.attrib.get("data-src") or img_el.attrib.get("src")) if img_el else None
        if image and image.startswith("/"): image = f"{BASE_DOMAIN}{image}"

        price_el = el.css(".product-price strong").first or el.css(".product-price").first
        price_text = price_el.get_all_text().strip() if price_el else "0"
        price_clean = re.sub(r"[^\d,]", "", price_text).replace(",", ".")
        try: price = float(price_clean)
        except: price = 0.0

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

        if name:
            name_specs = extract_specs_from_name(f"{name} {link}")
            for k, v in specs.items():
                if v == "N/A" and name_specs.get(k) != "N/A":
                    specs[k] = name_specs[k]

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

    print(f"[Itopya] Total {len(unique_products)} products, fetching detail pages for Case/PSU/Cooler...", flush=True)

    # Concurrent detail page fetching
    cache = _load_detail_cache()
    sem = asyncio.Semaphore(3)
    detail_tasks = []
    for p in unique_products:
        if any(p["specs"].get(k, "N/A") == "N/A" for k in ("Case", "PSU", "Cooler")):
            detail_tasks.append(
                (_fetch_detail_async(p["url"], sem, cache), p)
            )

    batch_size = 100
    for i in range(0, len(detail_tasks), batch_size):
        batch = detail_tasks[i:i + batch_size]
        results = await asyncio.gather(*[t[0] for t in batch])
        for detail_result, (_, product) in zip(results, batch):
            for k in ("Case", "PSU", "Cooler"):
                if product["specs"].get(k, "N/A") == "N/A" and detail_result.get(k, "N/A") != "N/A":
                    product["specs"][k] = detail_result[k]
        print(f"  [Itopya] Detail pages processed: {min(i + batch_size, len(detail_tasks))}/{len(detail_tasks)}", flush=True)

    _save_detail_cache(cache)

    print(f"[Itopya] Complete: {len(unique_products)} products.", flush=True)
    return unique_products

def scrape_all_pages():
    return asyncio.run(scrape_all_pages_async())

if __name__ == "__main__":
    res = scrape_all_pages()
    print(f"Total: {len(res)}")
