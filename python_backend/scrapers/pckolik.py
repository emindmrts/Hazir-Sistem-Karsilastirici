import re
import asyncio
from scrapling import Fetcher
from .utils import extract_specs_from_list, extract_specs_from_name

STORE = "pckolik"
BASE_URL = "https://pckolik.com.tr/kategori/oem-paketler"
SITE_BASE = "https://pckolik.com.tr"
PRODUCT_SEL = ".product-card"


def _parse_price(card) -> float:
    # PCKolik'te fiyat .price icinde: "26.999,00TL" veya .price-new icinde
    selectors = [".price-new", ".price", ".current-price", ".product-price", ".price-box"]
    raw = ""
    for sel in selectors:
        el = card.css(sel).first
        if el:
            raw = el.get_all_text().strip()
            if raw:
                break

    if not raw:
        all_text = card.get_all_text()
        match = re.search(r"(\d[\d\.]*(?:,\d+)?)\s*(?:TL|₺)", all_text)
        if match:
            raw = match.group(1)

    if not raw:
        return 0.0

    clean = re.sub(r"[^\d,.]", "", raw)
    if "." in clean and "," in clean:
        clean = clean.replace(".", "").replace(",", ".")
    elif "," in clean:
        clean = clean.replace(",", ".")

    try:
        return float(clean)
    except ValueError:
        return 0.0


def _parse_page_products(page) -> list[dict]:
    products = []
    if not page:
        return products

    for card in page.css(PRODUCT_SEL):
        # Link check
        a_el = card.css("a.name").first or card.css("a").first
        href = a_el.attrib.get("href", "") if a_el else ""
        if not href or "javascript" in href.lower():
            continue

        if href and not href.startswith("http"):
            href = f"{SITE_BASE}{'/' if not href.startswith('/') else ''}{href}"

        # Name
        name = "N/A"
        for name_sel in [".name", "a.name", "a.product-name", ".product-title", ".product-name", "h2", "h3"]:
            name_el = card.css(name_sel).first
            if name_el:
                name = name_el.get_all_text().strip()
                if name and name != "N/A":
                    name = name.split('\n')[0].strip()
                    break
        
        # Price extraction
        price = _parse_price(card)

        # Image
        image = None
        for img in card.css("img"):
            src = img.attrib.get("src") or ""
            if not src or src.startswith("/assets/"):
                continue
            if src.endswith(".svg") or src.endswith(".gif"):
                continue
            if "icon" in src.lower():
                continue
            image = f"{SITE_BASE}{src}" if src.startswith("/") else src
            break

        features = [(li.get_all_text() if hasattr(li, 'get_all_text') else li.text).strip() for li in card.css("li")]
        specs = extract_specs_from_list(features)

        if name and name != "N/A":
            name_specs = extract_specs_from_name(name)
            for k, v in specs.items():
                if v == "N/A" and name_specs.get(k) != "N/A":
                    specs[k] = name_specs[k]

        products.append({
            "name": name,
            "price": price,
            "image": image,
            "url": href,
            "store": STORE,
            "specs": specs,
        })

    return products


async def scrape_all_pages_async() -> list[dict]:
    print(f"[PCKolik] Ilk sayfa yukleniyor: {BASE_URL}", flush=True)
    fetcher = Fetcher()

    def fetch_sync(url):
        try:
            return fetcher.get(url)
        except Exception as e:
            print(f"[PCKolik] Fetch hatasi: {e}", flush=True)
            return None

    first_page = await asyncio.to_thread(fetch_sync, BASE_URL)
    if not first_page:
        print("[PCKolik] Ilk sayfa yuklenemedi", flush=True)
        return []

    try:
        nums = [int(a.text.strip()) for a in first_page.css(".pagination a, .page-link") if a.text.strip().isdigit()]
        total_pages = max(nums) if nums else 1
    except Exception:
        total_pages = 1

    print(f"[PCKolik] {total_pages} sayfa bulundu", flush=True)
    all_products = _parse_page_products(first_page)
    seen_urls = {p["url"] for p in all_products if p.get("url")}
    print(f"[PCKolik] Sayfa 1: {len(all_products)} urun", flush=True)

    if total_pages > 1:
        sem = asyncio.Semaphore(2)

        async def fetch_n(n):
            url = f"{BASE_URL}?page={n}"
            async with sem:
                for attempt in range(3):
                    try:
                        page = await asyncio.to_thread(fetch_sync, url)
                        products = _parse_page_products(page)
                        if products:
                            print(f"[PCKolik] Sayfa {n}: {len(products)} urun", flush=True)
                            return products
                    except Exception as e:
                        print(f"[PCKolik] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        await asyncio.sleep(2)
                return []

        results = await asyncio.gather(*[fetch_n(i) for i in range(2, total_pages + 1)], return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                for p in r:
                    if p["url"] not in seen_urls:
                        seen_urls.add(p["url"])
                        all_products.append(p)

    print(f"[PCKolik] Toplam {len(all_products)} urun cekildi", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    print(f"Bitti: {len(products)} urun.")



