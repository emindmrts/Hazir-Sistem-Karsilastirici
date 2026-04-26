"""
GencerGaming scraper - StealthyFetcher
- wait_selector: .card-product (pagination degil)
- Concurrent page fetching with Semaphore(3)
"""
import asyncio
import re
from scrapling.fetchers import StealthyFetcher

STORE = "gencergaming"
BASE_URL = "https://www.gencergaming.com/hazir-sistemler"
PRODUCT_SEL = ".card-product"


def _parse_page_products(page) -> list[dict]:
    products = []
    for item in page.css(PRODUCT_SEL):
        title_el = item.css(".title.hzr").first
        name = title_el.text.strip() if title_el else "N/A"
        link_el = item.css(".c-p-i-link").first
        link = link_el.attrib.get("href") if link_el else None
        img_el = item.css(".image img").first
        image = img_el.attrib.get("src") if img_el else None
        price = 0.0
        price_el = item.css(".sale-price").first
        if price_el:
            raw = re.sub(r"[^\d,]", "", price_el.text).replace(",", ".")
            try:
                price = float(raw)
            except ValueError:
                price = 0.0
        specs = {}
        for li in item.css(".attributes .nitelik li"):
            img = li.css("img").first
            val_el = li.css(".value").first
            if img and val_el:
                src = (img.attrib.get("src") or "").lower()
                val = val_el.text.strip()
                if "islemci" in src:
                    specs["CPU"] = val
                elif "ekran_kart" in src:
                    specs["GPU"] = val
                elif "ram" in src:
                    specs["RAM"] = val
                elif "depolama" in src:
                    specs["Storage"] = val
                elif "anakart" in src:
                    specs["Motherboard"] = val
        products.append({"name": name, "price": price, "image": image, "url": link, "store": STORE, "specs": specs})
    return products


async def _fetch_page(url: str) -> list[dict]:
    page = await StealthyFetcher.async_fetch(url, headless=True, wait_until="domcontentloaded",
                                              timeout=60000, wait_selector=PRODUCT_SEL, wait_selector_state="attached")
    return _parse_page_products(page)


async def scrape_all_pages_async() -> list[dict]:
    print(f"[GencerGaming] Ilk sayfa: {BASE_URL}", flush=True)
    try:
        first_page = await StealthyFetcher.async_fetch(BASE_URL, headless=True, wait_until="domcontentloaded",
                                                        timeout=60000, wait_selector=PRODUCT_SEL, wait_selector_state="attached")
    except Exception as e:
        print(f"[GencerGaming] Ilk sayfa hatasi: {e}", flush=True)
        return []

    try:
        nums = [int(a.text.strip()) for a in first_page.css(".pagination li a") if a.text.strip().isdigit()]
        total_pages = max(nums) if nums else 1
    except Exception:
        total_pages = 1

    print(f"[GencerGaming] {total_pages} sayfa", flush=True)
    all_products = _parse_page_products(first_page)

    if total_pages > 1:
        sem = asyncio.Semaphore(3)
        async def fetch_n(n):
            url = f"{BASE_URL}?sayfa={n}"
            async with sem:
                for attempt in range(3):
                    try:
                        return await _fetch_page(url)
                    except Exception as e:
                        print(f"[GencerGaming] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        await asyncio.sleep(3)
                return []
        results = await asyncio.gather(*[fetch_n(i) for i in range(2, total_pages + 1)], return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                all_products.extend(r)

    print(f"[GencerGaming] Toplam {len(all_products)} urun", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    with open("gencergaming_test.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("gencergaming_test.json kaydedildi")
