import re
"""
Tebilon scraper - StealthyFetcher
- wait_selector: .showcase__product (pagination degil)
- Concurrent page fetching with Semaphore(5)
"""
import asyncio
from scrapling.fetchers import StealthyFetcher
from scrapling import Fetcher
from .utils import extract_specs_from_name, extract_specs_from_list

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
        
        specs = extract_specs_from_name(name)
        products.append({"name": name, "price": price, "image": image, "url": link, "store": STORE, "specs": specs})
    return products


async def _fetch_page(url: str) -> list[dict]:
    page = await StealthyFetcher.async_fetch(url, headless=True, wait_until="domcontentloaded",
                                              timeout=60000, wait_selector=PRODUCT_SEL, wait_selector_state="attached")
    return _parse_page_products(page)

async def _fetch_product_details(product: dict, fetcher_instance) -> dict:
    if product["specs"].get("Case") != "N/A" and product["specs"].get("PSU") != "N/A":
        return product
        
    url = product["url"]
    def sync_fetch():
        try:
            return fetcher_instance.get(url, stealthy_headers=True)
        except:
            return None
            
    for attempt in range(2):
        try:
            page = await asyncio.to_thread(sync_fetch)
            if not page: continue
            
            checked = page.css("input:checked")
            if checked:
                spec_items = []
                for c in checked:
                    gp = c.xpath("../..")
                    if gp:
                        text = gp[0].get_all_text().strip()
                        if text: spec_items.append(text)
                        
                if spec_items:
                    extra_specs = extract_specs_from_list(spec_items)
                    for k, v in extra_specs.items():
                        if product["specs"].get(k, "N/A") == "N/A" and v != "N/A":
                            product["specs"][k] = v
            break
        except Exception as e:
            await asyncio.sleep(2)
            
    return product


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
        sem = asyncio.Semaphore(5)
        async def fetch_n(n):
            async with sem:
                for attempt in range(3):
                    try:
                        return await _fetch_page(f"{BASE_URL}?page={n}")
                    except Exception as e:
                        print(f"[Tebilon] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        pass
                return []
        results = await asyncio.gather(*[fetch_n(i) for i in range(2, total_pages + 1)], return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                all_products.extend(r)

    print(f"[{STORE}] Fetching details for {len(all_products)} products...", flush=True)
    static_fetcher = Fetcher()
    detail_sem = asyncio.Semaphore(15)
    async def fetch_detail_with_sem(prod):
        async with detail_sem:
            return await _fetch_product_details(prod, static_fetcher)
            
    detail_tasks = [fetch_detail_with_sem(p) for p in all_products]
    all_products = await asyncio.gather(*detail_tasks)

    print(f"[{STORE}] Toplam {len(all_products)} urun", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    with open("tebilon_test.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("tebilon_test.json kaydedildi")


