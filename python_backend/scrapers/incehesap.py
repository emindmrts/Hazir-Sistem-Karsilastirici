import re
"""
InceHesap scraper - StealthyFetcher
- Selector: #product-grid > div (Node.js route ile eslestirildi)
- Fiyat: data-product JSON attr veya .text-orange-500
- Concurrent page fetching with Semaphore(5)
"""
import asyncio
import json as json_lib
from scrapling.fetchers import StealthyFetcher

STORE = "inceHesap"
BASE_URL = "https://www.incehesap.com/hazir-sistemler-fiyatlari/"
PRODUCT_SEL = "#product-grid > div"


def _parse_page_products(page) -> list[dict]:
    products = []
    for el in page.css(PRODUCT_SEL):
        # Isim
        name_el = el.css("p.text-lg.font-semibold").first
        name = name_el.text.strip() if name_el else "N/A"

        # Link - itemprop='url' veya a.flex
        link_el = el.css("a[itemprop='url']").first or el.css("a.flex.items-center.justify-center").first
        link = link_el.attrib.get("href") if link_el else None
        if link and not link.startswith("http"):
            link = "https://www.incehesap.com" + link

        # Fiyat - oncelik data-product JSON, sonra text
        price = 0.0
        data_el = el.css("a[data-product]").first
        if data_el:
            raw_json = data_el.attrib.get("data-product", "")
            if raw_json:
                try:
                    parsed = json_lib.loads(raw_json)
                    price = float(parsed.get("price", 0))
                except (json_lib.JSONDecodeError, ValueError, TypeError):
                    pass

        if price == 0.0:
            price_el = el.css(".text-orange-500").first or el.css(".font-bold.text-orange-500").first
            if price_el:
                raw = re.sub(r"[^\d,]", "", price_el.text).replace(",", ".")
                try:
                    price = float(raw)
                except ValueError:
                    price = 0.0

        # Resim
        img_el = el.css("img").first
        image = img_el.attrib.get("src") if img_el else None

        # Specs
        specs = {
            "CPU": "N/A",
            "Motherboard": "N/A",
            "GPU": "N/A",
            "RAM": "N/A",
            "Storage": "N/A",
        }

        if 'spec_items' in locals() and spec_items:
            def find(*kws):
                return next((x for x in spec_items if any(k.lower() in x.lower() for k in kws)), "N/A")
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
            "name": name, "price": price, "image": image,
            "url": link, "store": STORE, "specs": specs,
        })
    return products


async def _fetch_page(url: str) -> list[dict]:
    page = await StealthyFetcher.async_fetch(
        url, headless=True, wait_until="domcontentloaded",
        timeout=60000, wait_selector="#product-grid", wait_selector_state="attached",
    )
    return _parse_page_products(page)


async def scrape_all_pages_async() -> list[dict]:
    print(f"[InceHesap] Ilk sayfa: {BASE_URL}", flush=True)
    try:
        first_page = await StealthyFetcher.async_fetch(
            BASE_URL, headless=True, wait_until="domcontentloaded",
            timeout=60000, wait_selector="#product-grid", wait_selector_state="attached",
        )
    except Exception as e:
        print(f"[InceHesap] Ilk sayfa hatasi: {e}", flush=True)
        return []

    try:
        nums = [int(a.text.strip()) for a in first_page.css("nav a") if a.text.strip().isdigit()]
        total_pages = max(nums) if nums else 1
    except Exception:
        total_pages = 1

    print(f"[InceHesap] {total_pages} sayfa", flush=True)
    all_products = _parse_page_products(first_page)
    print(f"[InceHesap] Sayfa 1: {len(all_products)} urun", flush=True)

    if total_pages > 1:
        sem = asyncio.Semaphore(5)
        async def fetch_n(n):
            url = f"{BASE_URL}sayfa-{n}/"
            async with sem:
                for attempt in range(3):
                    try:
                        return await _fetch_page(url)
                    except Exception as e:
                        print(f"[InceHesap] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        pass
                return []
        results = await asyncio.gather(*[fetch_n(i) for i in range(2, total_pages + 1)], return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                all_products.extend(r)

    print(f"[InceHesap] Toplam {len(all_products)} urun", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    products = scrape_all_pages()
    with open("incehesap_test.json", "w", encoding="utf-8") as f:
        json_lib.dump(products, f, ensure_ascii=False, indent=2)
    print("incehesap_test.json kaydedildi")


