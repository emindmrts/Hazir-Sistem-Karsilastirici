import re
"""
Tebilon scraper - StealthyFetcher
- wait_selector: .showcase__product (pagination degil)
- Concurrent page fetching with Semaphore(3)
"""
import asyncio
from scrapling.fetchers import StealthyFetcher

STORE = "tebilon"
BASE_URL = "https://www.tebilon.com/hazir-sistemler/"
PRODUCT_SEL = ".showcase__product"


def _parse_page_products(page) -> list[dict]:
    products = []
    for el in page.css(PRODUCT_SEL):
        name_el = el.css(".showcase__title a").first
        name = name_el.text.strip() if name_el else "N/A"
        link = name_el.attrib.get("href") if name_el else None
        if link and not link.startswith("http"):
            link = f"https://www.tebilon.com{link}"
        price_el = el.css(".newPrice").first
        price_text = price_el.text if price_el else "0"
        price_clean = re.sub(r"[^\d,]", "", price_text).replace(",", ".")
        try:
            price = float(price_clean)
        except ValueError:
            price = 0.0
        img_el = el.css(".showcase__image img").first
        image = img_el.attrib.get("src") if img_el else None
        products.append({"name": name, "price": price, "image": image, "url": link, "store": STORE, "specs": {}})
    return products


async def _fetch_page(url: str) -> list[dict]:
    page = await StealthyFetcher.async_fetch(url, headless=True, wait_until="domcontentloaded",
                                              timeout=60000, wait_selector=PRODUCT_SEL, wait_selector_state="attached")
    return _parse_page_products(page)


async def scrape_all_pages_async() -> list[dict]:
    print(f"[Tebilon] Ilk sayfa: {BASE_URL}", flush=True)
    try:
        first_page = await StealthyFetcher.async_fetch(BASE_URL, headless=True, wait_until="domcontentloaded",
                                                        timeout=60000, wait_selector=PRODUCT_SEL, wait_selector_state="attached")
    except Exception as e:
        print(f"[Tebilon] Ilk sayfa hatasi: {e}", flush=True)
        return []

    try:
        nums = [int(a.text.strip()) for a in first_page.css(".productSort__pagination a") if a.text.strip().isdigit()]
        total_pages = max(nums) if nums else 1
    except Exception:
        total_pages = 1

    print(f"[Tebilon] {total_pages} sayfa", flush=True)
    all_products = _parse_page_products(first_page)

    if total_pages > 1:
        sem = asyncio.Semaphore(3)
        async def fetch_n(n):
            async with sem:
                for attempt in range(3):
                    try:
                        return await _fetch_page(f"{BASE_URL}?page={n}")
                    except Exception as e:
                        print(f"[Tebilon] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        await asyncio.sleep(3)
                return []
        results = await asyncio.gather(*[fetch_n(i) for i in range(2, total_pages + 1)], return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                all_products.extend(r)

    print(f"[Tebilon] Toplam {len(all_products)} urun", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    with open("tebilon_test.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("tebilon_test.json kaydedildi")
