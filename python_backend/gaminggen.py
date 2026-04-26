"""
GamingGen scraper - StealthyFetcher
- wait_selector: li.product (pagination degil)
- Concurrent page fetching with Semaphore(3)
"""
import asyncio
import re
from scrapling.fetchers import StealthyFetcher

STORE = "gamingGen"
BASE_URL = "https://www.gaming.gen.tr/kategori/hazir-sistemler/"
PRODUCT_SEL = "li.product"


def _parse_page_products(page) -> list[dict]:
    products = []
    for item in page.css(PRODUCT_SEL):
        title_el = item.css(".pc-specs-title").first
        name = title_el.text.strip() if title_el else "N/A"
        a_el = item.css("a").first
        link = a_el.attrib.get("href") if a_el else None
        img_el = item.css("img").first
        image = img_el.attrib.get("src") if img_el else None
        price = 0.0
        price_el = item.css(".price").first
        if price_el:
            ins_el = price_el.css("ins").first
            price_text = ins_el.text if ins_el else price_el.text
            raw = re.sub(r"[^\d,]", "", price_text).replace(",", ".")
            try:
                price = float(raw)
            except ValueError:
                price = 0.0
        spec_items = [li.text.strip() for li in item.css(".pc-specs-list li")]
        def find(*kws):
            return next((x for x in spec_items if any(k.lower() in x.lower() for k in kws)), "N/A")
        specs = {
            "CPU": find("islemci", "cpu", "ryzen", "core", "intel", "amd"),
            "Motherboard": find("anakart", "mb"),
            "GPU": find("rtx", "gtx", "rx ", "arc"),
            "RAM": find("mhz", "ram", "ddr", "cl"),
            "Storage": find("ssd", "m.2", "nvme", "tb"),
        }
        products.append({"name": name, "price": price, "image": image, "url": link, "store": STORE, "specs": specs})
    return products


async def _fetch_page(url: str) -> list[dict]:
    page = await StealthyFetcher.async_fetch(url, headless=True, wait_until="domcontentloaded",
                                              timeout=60000, wait_selector=PRODUCT_SEL, wait_selector_state="attached")
    return _parse_page_products(page)


async def scrape_all_pages_async() -> list[dict]:
    print(f"[GamingGen] Ilk sayfa: {BASE_URL}", flush=True)
    try:
        first_page = await StealthyFetcher.async_fetch(BASE_URL, headless=True, wait_until="domcontentloaded",
                                                        timeout=60000, wait_selector=PRODUCT_SEL, wait_selector_state="attached")
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
        sem = asyncio.Semaphore(3)
        async def fetch_n(n):
            async with sem:
                for attempt in range(3):
                    try:
                        return await _fetch_page(f"{BASE_URL}page/{n}/")
                    except Exception as e:
                        print(f"[GamingGen] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        await asyncio.sleep(3)
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
