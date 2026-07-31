"""
Sinerji scraper — Fetcher (static HTML).
Detail page fetch eklenmistir: listing'de olmayan Motherboard/Case/PSU/Cooler
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

STORE = "sinerji"
BASE_URL = "https://www.sinerji.gen.tr/oyun-icin-oem-paketler-c-2202"
SITE = "https://www.sinerji.gen.tr"


def _parse_price(el) -> float:
    price_el = el.css(".price").first
    if not price_el:
        return 0.0
    texts = [t.get().strip() for t in price_el.xpath(".//text()") if t.get().strip()]
    raw = "".join(texts)
    clean = re.sub(r"[^\d,]", "", raw).replace(",", ".")
    try:
        return float(clean)
    except ValueError:
        return 0.0


def _parse_page_products(page) -> list[dict]:
    products = []
    for el in page.css(".product"):
        name_el = el.css(".titleShort").first or el.css(".title a").first
        name = name_el.get_all_text().strip() if name_el else "N/A"

        link_el = el.css(".title a").first
        link = link_el.attrib.get("href") if link_el else None
        if link and not link.startswith("http"):
            link = f"{SITE}{link}" if link.startswith("/") else f"{SITE}/{link}"

        price = _parse_price(el)
        img_el = el.css(".img img").first
        image = img_el.attrib.get("src") if img_el else None

        spec_items = [s.get_all_text().strip() for s in el.css(".technicalSpecsWithLogo")]
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
    """sinerji detail: <tr><th>Label</th><td>Value</td></tr>."""
    rows = []
    if not page:
        return rows
    for tr in page.css("table tr"):
        cells = tr.css("th, td")
        if len(cells) >= 2:
            label = (cells[0].get_all_text() if hasattr(cells[0], "get_all_text") else cells[0].text).strip()
            value = (cells[-1].get_all_text() if hasattr(cells[-1], "get_all_text") else cells[-1].text).strip()
            if label and value and label != value:
                rows.append((label, value))
    return rows


def _section_to_spec(sec_name: str) -> str | None:
    """Match a section name to a spec field, handling variants."""
    low = sec_name.lower()
    if "işlemci" in low and "soğutucu" not in low and "sogutucu" not in low:
        return "CPU"
    if "anakart" in low:
        return "Motherboard"
    if "bellek" in low or "ram" in low:
        return "RAM"
    if "ekran kartı" in low or "ekran karti" in low or "gpu" in low:
        return "GPU"
    if "ssd" in low or "depolama" in low or "disk" in low:
        return "Storage"
    if "kasa" in low and "aksesuar" not in low:
        return "Case"
    if "güç" in low or "guc" in low or "psu" in low or "power" in low:
        return "PSU"
    if "soğutucu" in low or "sogutucu" in low or "cooler" in low:
        return "Cooler"
    return None


def _parse_configurator_specs(page) -> dict[str, str]:
    """Parse preBuiltPcCategory sections for default product names.

    Iterates over each <div class="preBuiltPcCategory">, reads the <h3> section
    name, finds the default option (data-isdefault="true") or the first option,
    and returns the product name from the label's direct text node.
    If the PSU section is missing, tries to extract PSU from the case name.
    """
    result: dict[str, str] = {}
    case_name = None
    cats = page.css(".preBuiltPcCategory")
    has_psu_section = False
    for cat in cats:
        h3 = cat.css("h3").first
        if not h3:
            continue
        sec_name = h3.get_all_text().strip()
        spec_key = _section_to_spec(sec_name)
        if not spec_key:
            continue
        if spec_key == "PSU":
            has_psu_section = True

        prods = cat.css(".preBuiltPcProduct")
        default_prod = None
        for prod in prods:
            if prod.attrib.get("data-isdefault", "false") == "true":
                default_prod = prod
                break
        if not default_prod and prods:
            default_prod = prods[0]
        if not default_prod:
            continue

        label = default_prod.css("label").first
        if not label:
            continue
        # Get only the direct text node (skip badge/price/i child elements)
        texts = [t.get().strip() for t in label.xpath("./text()") if t.get().strip()]
        if texts:
            val = texts[0]
            result[spec_key] = val
            if spec_key == "Case":
                case_name = val

    # If no dedicated PSU section, try extracting PSU from case name
    if not has_psu_section and case_name:
        psu = _psu_from_case(case_name)
        if psu != "N/A":
            result["PSU"] = psu

    return result


def _psu_from_case(case_name: str) -> str:
    """Extract PSU string from a case product name."""
    m = re.search(r'(\d{3,4}\s*W(?:\s*80\s*\+\s*(?:Bronze|Gold|Platinum|Titanium|White)?)?)', case_name, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # Also catch bare wattage at word boundary (e.g. "650" at end)
    m = re.search(r'\b(\d{3,4})\s*(?:W\b|$|80)', case_name, re.IGNORECASE)
    if m:
        return m.group(1) + "W"
    return "N/A"


async def _fetch_product_details(product: dict, fetcher, cache=None) -> dict:
    specs = product["specs"]
    if all(specs.get(k) != "N/A" for k in ("Motherboard", "Case", "PSU", "Cooler", "CPU")):
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
        detail = {}
        if rows:
            detail.update(extract_specs_from_table(rows))
        config = _parse_configurator_specs(page)
        for k, v in config.items():
            if k not in detail or detail[k] == "N/A":
                detail[k] = v
        if detail:
            merge_specs(specs, detail)
            if cache is not None:
                cache[url] = cacheable_specs(detail)
        break
    return product


async def scrape_all_pages_async() -> list[dict]:
    print(f"[Sinerji] Fetching {BASE_URL}", flush=True)
    fetcher = Fetcher()

    def fetch_sync(url):
        try:
            return fetcher.get(url)
        except Exception as e:
            print(f"[Sinerji] Fetch hatasi: {e}", flush=True)
            return None

    all_products: list[dict] = []
    seen_urls: set[str] = set()
    page_num = 1

    while True:
        url = f"{BASE_URL}?px={page_num}" if page_num > 1 else BASE_URL
        page = await asyncio.to_thread(fetch_sync, url)
        if not page:
            break
        batch = _parse_page_products(page)
        if not batch:
            break
        new = 0
        for p in batch:
            if p["url"] and p["url"] not in seen_urls:
                seen_urls.add(p["url"])
                all_products.append(p)
                new += 1
        print(f"[Sinerji] Sayfa {page_num}: {new} yeni urun", flush=True)
        if new == 0:
            break
        page_num += 1

    cache = load_detail_cache()
    cached = sum(1 for p in all_products if p.get("url") in cache)
    missing = sum(1 for p in all_products
                  if any(p["specs"].get(k) == "N/A"
                         for k in ("Motherboard", "Case", "PSU", "Cooler"))
                  and p.get("url") not in cache)
    print(f"[Sinerji] {len(all_products)} urun · {cached} onbellekten · "
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

    print(f"[Sinerji] Toplam {len(all_products)} urun cekildi", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    print(f"Bitti: {len(products)} urun.")
