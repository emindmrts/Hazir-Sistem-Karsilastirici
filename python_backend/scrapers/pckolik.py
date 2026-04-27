import re
"""
PCKolik scraper - StealthyFetcher
- wait_selector artik .product-card (pagination degil)
- Concurrent page fetching with Semaphore(3)
- Price extraction fix: xpath text() ile nested element dahil
"""
import asyncio
from scrapling.fetchers import StealthyFetcher

STORE = "pckolik"
BASE_URL = "https://pckolik.com.tr/kategori/oem-paketler"
PRODUCT_SEL = ".product-card"


def _parse_price(card) -> float:
    # PCKolik'te fiyatlar .current-price, .product-price veya .price-new icinde olabilir
    selectors = [".current-price", ".product-price", ".price-new", ".price-box", ".price"]
    raw = ""
    for sel in selectors:
        el = card.css(sel).first
        if el:
            raw = el.get_all_text().strip()
            if raw:
                break
    
    if not raw:
        # Fallback: Kart icinde TL simgesi veya metni olan ilk yeri bul
        all_text = card.get_all_text()
        # "12.345,67 TL" formatini yakala
        match = re.search(r"(\d[\d\.]*(?:,\d+)?)\s*(?:TL|₺)", all_text)
        if match:
            raw = match.group(1)

    if not raw:
        return 0.0

    clean = re.sub(r"[^\d,.]", "", raw)
    # Eger hem nokta hem virgul varsa (12.345,67), noktayi sil, virgulu nokta yap
    if "." in clean and "," in clean:
        clean = clean.replace(".", "").replace(",", ".")
    # Sadece virgul varsa (12345,67), virgulu nokta yap
    elif "," in clean:
        clean = clean.replace(",", ".")
    
    try:
        return float(clean)
    except ValueError:
        return 0.0


def _parse_page_products(page) -> list[dict]:
    products = []
    for card in page.css(PRODUCT_SEL):
        name_el = card.css(".name").first
        name = name_el.text.strip() if name_el else "N/A"

        price = _parse_price(card)

        img_el = next(
            (img for img in card.css("img") if "icon-star" not in (img.attrib.get("src") or "")),
            None,
        )
        image = (img_el.attrib.get("data-src") or img_el.attrib.get("src")) if img_el else None

        a_el = card.css("a").first
        href = a_el.attrib.get("href", "") if a_el else ""
        if href and not href.startswith("http"):
            href = f"https://pckolik.com.tr{'/' if not href.startswith('/') else ''}{href}"

        features = [(li.get_all_text() if hasattr(li, 'get_all_text') else li.text).strip() for li in card.css("li")]
        specs = {
            "CPU": "N/A",
            "Motherboard": "N/A",
            "GPU": "N/A",
            "RAM": "N/A",
            "Storage": "N/A",
        }

        if features:
            def find(*kws):
                return next((x for x in features if any(k.lower() in x.lower() for k in kws)), "N/A")
            specs["CPU"] = find("islemci", "cpu", "ryzen", "core", "intel", "amd", "i3", "i5", "i7", "i9", "r3", "r5", "r7", "r9")
            specs["Motherboard"] = find("anakart", "mb", "b450", "b550", "a520", "h610", "b650", "a620", "b760", "z790", "b660", "x670")
            specs["GPU"] = find("rtx", "gtx", "rx ", "arc", "radeon", "ekran")
            specs["RAM"] = find("mhz", "ram", "ddr", "cl")
            specs["Storage"] = find("ssd", "m.2", "nvme", "tb")

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



        products.append({
            "name": name,
            "price": price,
            "image": image,
            "url": href,
            "store": STORE,
            "specs": specs,
        })
    return products


async def _fetch_page(url: str) -> list[dict]:
    page = await StealthyFetcher.async_fetch(
        url,
        headless=True,
        wait_until="networkidle",
        timeout=90000,
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
            wait_until="networkidle",
            timeout=90000,
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
