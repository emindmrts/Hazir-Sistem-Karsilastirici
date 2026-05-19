import re
"""v
PCKolik scraper - StealthyFetcher
- wait_selector artik .product-card (pagination degil)
- Concurrent page fetching with Semaphore(5)
- Price extraction fix: xpath text() ile nested element dahil
"""
import asyncio
from scrapling.fetchers import StealthyFetcher
from .utils import extract_specs_from_list, extract_specs_from_name

STORE = "pckolik"
BASE_URL = "https://pckolik.com.tr/kategori/oem-paketler"
SITE_BASE = "https://pckolik.com.tr"
PRODUCT_SEL = ".product-card"


def _parse_price(card) -> float:
    # PCKolik'te fiyat .price icinde: "26.999,00₺"
    selectors = [".price", ".current-price", ".product-price", ".price-new", ".price-box"]
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
    for card in page.css(PRODUCT_SEL):
        # Link check - skip if it's not a real product link (e.g. javascript:void(0))
        a_el = card.css("a").first
        href = a_el.attrib.get("href", "") if a_el else ""
        if not href or "javascript" in href.lower():
            continue

        if href and not href.startswith("http"):
            href = f"{SITE_BASE}{'/' if not href.startswith('/') else ''}{href}"

        # Name: try multiple selectors
        name = "N/A"
        for name_sel in ["a.product-name", ".product-title", ".product-name", ".name", "h2", "h3"]:
            name_el = card.css(name_sel).first
            if name_el:
                name = name_el.get_all_text().strip()
                if name and name != "N/A":
                    # Clean up if price is appended to name
                    name = name.split('\n')[0].strip()
                    break
        
        # Price extraction
        price = _parse_price(card)
        if price == 0.0:
            # Try to find price in the whole card text if selectors fail
            txt = card.get_all_text()
            match = re.search(r"(\d[\d\.]*(?:,\d+)?)\s*(?:TL|₺)", txt)
            if match:
                raw_p = match.group(1).replace(".", "").replace(",", ".")
                try:
                    price = float(raw_p)
                except:
                    pass

        # Image: main system photo
        # Priority: timestamp-named PNG/JPG (e.g. /upload/1234567890-1.png) → these are the system photos
        # Skip: .gif (banner animations), icon-*.svg, /assets/ paths
        image = None
        for img in card.css("img"):
            src = img.attrib.get("src") or ""
            if not src or src.startswith("/assets/"):
                continue
            # Skip SVG icons and GIFs (promotional banners)
            if src.endswith(".svg") or src.endswith(".gif"):
                continue
            # Skip icon images
            if "icon" in src.lower():
                continue
            # Prefer timestamp-named files (system photos)
            import re as _re
            if _re.search(r'/upload/\d{10,}-', src):
                image = f"{SITE_BASE}{src}" if src.startswith("/") else src
                break
        
        # Fallback: first non-icon, non-gif upload image
        if not image:
            for img in card.css("img"):
                src = img.attrib.get("src") or ""
                if not src or src.startswith("/assets/") or src.endswith(".svg") or src.endswith(".gif") or "icon" in src.lower():
                    continue
                if src.startswith("/upload/") and not src.endswith("/upload/"):
                    image = f"{SITE_BASE}{src}" if src.startswith("/") else src
                    break
        
        raw_img = image

        # If price is 0 and it's out of stock, we can still add it but it will be filtered by frontend
        # However, user wants "price issue solved", so we keep it if we found a price.

        products.append({
            "name": name,
            "price": price,
            "image": image,
            "url": href,
            "store": STORE,
            "specs": {}, # Will be filled below
        })
        
        # Re-using the spec extraction logic
        # (Need to make sure specs dict is handled)
        curr_prod = products[-1]
        features = [(li.get_all_text() if hasattr(li, 'get_all_text') else li.text).strip() for li in card.css("li")]
        specs = extract_specs_from_list(features)
        
        curr_prod["specs"] = specs

        # Name fallback for specs if still N/A
        if name and name != "N/A":
            name_specs = extract_specs_from_name(name)
            for k, v in specs.items():
                if v == "N/A" and name_specs.get(k) != "N/A":
                    specs[k] = name_specs[k]

    return products


async def _fetch_page(url: str) -> list[dict]:
    page = await StealthyFetcher.async_fetch(
        url,
        headless=True,
        timeout=180000,
        wait_selector=PRODUCT_SEL,
        wait_selector_state="attached",
    )
    return _parse_page_products(page)


async def scrape_all_pages_async() -> list[dict]:
    print(f"[PCKolik] Ilk sayfa yukleniyor: {BASE_URL}", flush=True)

    try:
        first_page = await StealthyFetcher.async_fetch(
            BASE_URL,
            headless=True,
            timeout=180000,
            wait_selector=PRODUCT_SEL,
            wait_selector_state="attached",
        )
    except Exception as e:
        print(f"[PCKolik] Ilk sayfa hatasi: {e}", flush=True)
        return []

    try:
        # Sayfalama linklerini daha dikkatli bul
        nums = [int(a.text.strip()) for a in first_page.css(".pagination a, .page-link") if a.text.strip().isdigit()]
        total_pages = max(nums) if nums else 1
    except Exception:
        total_pages = 1

    print(f"[PCKolik] {total_pages} sayfa bulundu", flush=True)

    all_products = _parse_page_products(first_page)
    print(f"[PCKolik] Sayfa 1: {len(all_products)} urun", flush=True)

    if total_pages > 1:
        # Concurrency'i 2'ye dusurerek bloklanmayi onluyoruz
        sem = asyncio.Semaphore(2)

        async def fetch_n(n):
            url = f"{BASE_URL}?page={n}"
            async with sem:
                print(f"[PCKolik] Sayfa {n} taraniyor...", flush=True)
                for attempt in range(3):
                    try:
                        await asyncio.sleep(2) # Insansi bekleme
                        products = await _fetch_page(url)
                        print(f"[PCKolik] Sayfa {n}: {len(products)} urun", flush=True)
                        return products
                    except Exception as e:
                        print(f"[PCKolik] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        await asyncio.sleep(5)
                return []

        results = await asyncio.gather(*[fetch_n(i) for i in range(2, total_pages + 1)], return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                all_products.extend(r)

    print(f"[PCKolik] Toplam {len(all_products)} urun cekildi", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    with open("pckolik_test.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("pckolik_test.json kaydedildi")


