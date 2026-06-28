import re
import asyncio
from scrapling import Fetcher
from .utils import extract_specs_from_name, extract_specs_from_list

STORE = "tebilon"
BASE_URL = "https://www.tebilon.com/hazir-sistemler/"
PRODUCT_SEL = ".showcase__product"


def _parse_page_products(page) -> list[dict]:
    products = []
    if not page:
        return products
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


async def _fetch_page(url: str, fetcher_instance) -> list[dict]:
    def fetch_sync():
        try:
            return fetcher_instance.get(url)
        except:
            return None
    page = await asyncio.to_thread(fetch_sync)
    return _parse_page_products(page)


async def _fetch_product_details(product: dict, fetcher_instance) -> dict:
    if product["specs"].get("Case") != "N/A" and product["specs"].get("PSU") != "N/A":
        return product
        
    url = product["url"]
    if not url:
        return product

    def sync_fetch():
        try:
            return fetcher_instance.get(url)
        except:
            return None
            
    for attempt in range(3):
        try:
            page = await asyncio.to_thread(sync_fetch)
            if not page:
                await asyncio.sleep(1 + attempt)
                continue
            
            # Handle rate limiting / 429
            status = getattr(page, "status_code", 200)
            if status == 429:
                # Backoff longer
                await asyncio.sleep(4 + attempt * 4)
                continue

            checked = page.css("input:checked")
            if checked:
                spec_items = []
                for c in checked:
                    gp = c.xpath("../..")
                    if gp:
                        text = gp[0].get_all_text().strip()
                        if text:
                            spec_items.append(text)
                        
                if spec_items:
                    extra_specs = extract_specs_from_list(spec_items)
                    for k, v in extra_specs.items():
                        if product["specs"].get(k, "N/A") == "N/A" and v != "N/A":
                            product["specs"][k] = v
            break
        except Exception:
            await asyncio.sleep(2)
            
    return product


async def scrape_all_pages_async() -> list[dict]:
    print(f"[Tebilon] Ilk sayfa: {BASE_URL}", flush=True)
    fetcher = Fetcher()

    def fetch_sync(url):
        try:
            return fetcher.get(url)
        except Exception as e:
            print(f"[Tebilon] Fetch hatasi: {e}", flush=True)
            return None

    first_page = await asyncio.to_thread(fetch_sync, BASE_URL)
    if not first_page:
        print("[Tebilon] Ilk sayfa hatasi", flush=True)
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
                        return await _fetch_page(f"{BASE_URL}?page={n}", fetcher)
                    except Exception as e:
                        print(f"[Tebilon] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        pass
                return []
        results = await asyncio.gather(*[fetch_n(i) for i in range(2, total_pages + 1)], return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                all_products.extend(r)

    print(f"[{STORE}] Fetching details for {len(all_products)} products...", flush=True)
    
    # Lower concurrency to prevent 429
    detail_sem = asyncio.Semaphore(3)
    async def fetch_detail_with_sem(prod):
        async with detail_sem:
            res = await _fetch_product_details(prod, fetcher)
            # Add a small delay between requests
            await asyncio.sleep(0.5)
            return res
            
    detail_tasks = [fetch_detail_with_sem(p) for p in all_products]
    all_products = await asyncio.gather(*detail_tasks)

    print(f"[{STORE}] Toplam {len(all_products)} urun", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    products = scrape_all_pages()
    print(f"Bitti: {len(products)} urun.")




