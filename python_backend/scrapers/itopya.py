"""
Itopya scraper - Scrapling StealthyFetcher (JS rendering required)
Scrapling 0.4.7 API: css().first, el.attrib.get()
"""
import re
import asyncio
from scrapling.fetchers import StealthyFetcher

BASE_DOMAIN = "https://www.itopya.com"
BASE_URL    = f"{BASE_DOMAIN}/oem-paketler"

async def _fetch_page(url: str) -> list[dict]:
    """Fetch a single listing page and return parsed products."""
    page = await StealthyFetcher.async_fetch(
        url,
        headless=True,
        wait_until="networkidle",
        timeout=120000,
        wait_selector=".product",
        wait_selector_state="attached",
    )
    return page, _parse_page(page)


def _parse_page(page) -> list[dict]:
    products = []
    for el in page.css(".product"):
        # İsim & link
        link_els = [a for a in el.css("a") if a.text.strip()]
        name_el = link_els[0] if link_els else None
        name = name_el.text.strip() if name_el else "N/A"
        raw_href = name_el.attrib.get("href") if name_el else None
        # Make URL absolute
        if raw_href and raw_href.startswith("/"):
            link = BASE_DOMAIN + raw_href
        else:
            link = raw_href

        # Resim
        img_el = el.css("img").first
        image = (img_el.attrib.get("data-src") or img_el.attrib.get("src")) if img_el else None

        # Fiyat
        price_el = (
            el.css(".product-price strong").first
            or el.css(".product-price").first
            or el.css(".amount strong").first
            or el.css(".amount").first
            or el.css(".price-container strong").first
            or el.css(".price-container").first
        )
        
        price_text = "0"
        if price_el:
            price_text = price_el.text.strip()
            if not price_text and price_el.xpath("string()"):
                 price_text = price_el.xpath("string()").get() or "0"

        price_clean = re.sub(r"[^\d,]", "", price_text).replace(",", ".")
        try:
            price = float(price_clean)
        except ValueError:
            price = 0.0

        spec_items = [(li.get_all_text() if hasattr(li, 'get_all_text') else li.text).strip() for li in el.css(".product-block-feature li, .advice-system-feature p")]
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
            "name": name,
            "price": price,
            "image": image,
            "url": link,
            "store": "itopya",
            "specs": specs,
        })
    return products

async def scrape_all_pages_async() -> list[dict]:
    all_products = []
    seen_urls: set[str] = set()

    print(f"[Itopya] Ilk sayfa: {BASE_URL}", flush=True)
    try:
        first_page, first_products = await _fetch_page(BASE_URL)
    except Exception as e:
        print(f"[Itopya] Ilk sayfa hatasi: {e}", flush=True)
        return []

    # Toplam sayfa sayisini pagination'dan oku
    try:
        page_nums = [
            int(re.sub(r"[^\d]", "", el.text.strip()))
            for el in first_page.css(".pagination a, .pager a, [class*='page'] a")
            if re.sub(r"[^\d]", "", el.text.strip()).isdigit()
        ]
        total_pages = max(page_nums) if page_nums else 1
    except Exception:
        total_pages = 1

    print(f"[Itopya] {total_pages} sayfa tespit edildi", flush=True)

    # Ilk sayfayi ekle (dedup ile)
    for p in first_products:
        if p["url"] and p["url"] not in seen_urls:
            seen_urls.add(p["url"])
            all_products.append(p)

    if total_pages > 1:
        sem = asyncio.Semaphore(1)

        async def fetch_with_sem(page_num: int):
            url = f"{BASE_URL}?pg={page_num}"
            async with sem:
                print(f"[Itopya] Sayfa {page_num} taraniyor...", flush=True)
                await asyncio.sleep(3)
                for attempt in range(3):
                    try:
                        _, products = await _fetch_page(url)
                        print(f"[Itopya] Sayfa {page_num}: {len(products)} urun", flush=True)
                        return products
                    except Exception as e:
                        print(f"[Itopya] Sayfa {page_num} hata (deneme {attempt+1}): {e}", flush=True)
                        await asyncio.sleep(10)
                return []

        results = await asyncio.gather(*[fetch_with_sem(i) for i in range(2, total_pages + 1)])
        for batch in results:
            for p in batch:
                if p["url"] and p["url"] not in seen_urls:
                    seen_urls.add(p["url"])
                    all_products.append(p)

    print(f"[Itopya] Toplam {len(all_products)} benzersiz urun", flush=True)
    return all_products

def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    with open("itopya_test.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("itopya_test.json kaydedildi")
