import re
"""
GamingGen scraper - StealthyFetcher
- wait_selector: li.product (pagination degil)
- Concurrent page fetching with Semaphore(5)
"""
import asyncio
from scrapling.fetchers import StealthyFetcher

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
        image = img_el.attrib.get("src") if img_el else None
        price = _extract_price(item)
        spec_items = [
            _normalize(li.get_all_text() if hasattr(li, "get_all_text") else li.text)
            for li in item.css(".pc-specs-list li")
        ]
        specs = {
            "CPU": "N/A",
            "Motherboard": "N/A",
            "GPU": "N/A",
            "RAM": "N/A",
            "Storage": "N/A",
        }

        if spec_items:
            def find(*kws):
                return next((x for x in spec_items if any(k.lower() in x.lower() for k in kws)), "N/A")
            specs["CPU"]        = find("islemci", "cpu", "ryzen", "core", "intel", "amd", "i3", "i5", "i7", "i9", "r3", "r5", "r7", "r9")
            specs["Motherboard"] = find("anakart", "mb", "b450", "b550", "a520", "h610", "b650", "a620", "b760", "z790", "b660", "x670")
            specs["GPU"]        = find("rtx", "gtx", "rx ", "arc", "radeon", "ekran")
            specs["RAM"]        = find("mhz", "ram", "ddr", "cl")
            specs["Storage"]    = find("ssd", "m.2", "nvme", "tb")

        if name:
            if specs["CPU"] == "N/A":
                cpu_match = re.search(r"(INTEL[\w\s]+|AMD[\w\s]+|INTE\s+U\d[\w\s]+)", name, re.IGNORECASE)
                if cpu_match:
                    specs["CPU"] = cpu_match.group(1).strip()
                    specs["CPU"] = re.split(r"\s+RTX|\s+RX|\s+GTX|\s+ARC|\s*-", specs["CPU"], flags=re.IGNORECASE)[0].strip()
            
            if specs["GPU"] == "N/A":
                gpu_match = re.search(r"((?:RTX|GTX|RX|ARC|RADEON)\s*\d+[\w\s]*)", name, re.IGNORECASE)
                if gpu_match:
                    specs["GPU"] = gpu_match.group(1).strip()
                    specs["GPU"] = re.split(r"\s*-", specs["GPU"], flags=re.IGNORECASE)[0].strip()
                
            if specs["Storage"] == "N/A":
                storage_match = re.search(r"(\d+\s*(?:GB|TB)\s*(?:M\.2\s*)?(?:SSD|HDD|NVME))", name, re.IGNORECASE)
                if storage_match:
                    specs["Storage"] = storage_match.group(1).strip()
                
            if specs["RAM"] == "N/A":
                ram_match = re.search(r"(\d+\s*GB(?:\s*DDR\d)?\s*RAM|RAM)", name, re.IGNORECASE)
                if ram_match:
                    specs["RAM"] = ram_match.group(1).strip()
                
            if specs["Motherboard"] == "N/A":
                mb_match = re.search(r"((?:[AHBZX]\d{3}[A-Z]*(?:-\w+)?)(?:\s*DDR\d)?(?:\s*WIFI)?(?:\s*PRO)?(?:\s*PLUS)?)", name, re.IGNORECASE)
                if mb_match:
                    specs["Motherboard"] = mb_match.group(1).strip()


        products.append({"name": name, "price": price, "image": image, "url": link, "store": STORE, "specs": specs})
    return products


async def _fetch_page(url: str) -> list[dict]:
    page = await StealthyFetcher.async_fetch(url, headless=True, wait_until="networkidle",
                                               timeout=90000, wait_selector=PRODUCT_SEL, wait_selector_state="attached")
    return _parse_page_products(page)


async def scrape_all_pages_async() -> list[dict]:
    print(f"[GamingGen] Ilk sayfa: {BASE_URL}", flush=True)
    try:
        first_page = await StealthyFetcher.async_fetch(BASE_URL, headless=True, wait_until="networkidle",
                                                        timeout=90000, wait_selector=PRODUCT_SEL, wait_selector_state="attached")
    except Exception as e:
        print(f"[GamingGen] Ilk sayfa hatasi: {e}", flush=True)
        return []

    try:
        nums = [int(re.sub(r"[^\d]", "", el.text.strip())) for el in first_page.css(".page-numbers:not(.next)") if re.sub(r"[^\d]", "", el.text.strip()).isdigit()]
        total_pages = min(max(nums), 60) if nums else 1
    except Exception:
        total_pages = 1

    print(f"[GamingGen] {total_pages} sayfa", flush=True)
    all_products = _parse_page_products(first_page)

    if total_pages > 1:
        sem = asyncio.Semaphore(5)
        async def fetch_n(n):
            async with sem:
                for attempt in range(3):
                    try:
                        return await _fetch_page(f"{BASE_URL}page/{n}/")
                    except Exception as e:
                        print(f"[GamingGen] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        pass
                return []
        results = await asyncio.gather(*[fetch_n(i) for i in range(2, total_pages + 1)], return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                all_products.extend(r)

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


