"""
InceHesap scraper - StealthyFetcher
- Selector: #product-grid > div (Node.js route ile eslestirildi)
- Fiyat: data-product JSON attr veya .text-orange-500
- Concurrent page fetching with Semaphore(3)
"""
import asyncio
import json as json_lib
import re
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
        specs = {}
        for li in el.css("ul li"):
            text = li.text.strip()
            text_lower = text.lower()
            if "amd" in text_lower or "intel" in text_lower or "ryzen" in text_lower or "core" in text_lower:
                if "GPU" not in specs:  # CPU once gelir
                    specs["CPU"] = text
            if "rtx" in text_lower or "rx " in text_lower or "gtx" in text_lower or "arc" in text_lower:
                specs["GPU"] = text
            if "ddr4" in text_lower or "ddr5" in text_lower:
                specs["RAM"] = text
            if "ssd" in text_lower or "nvme" in text_lower:
                specs["Storage"] = text

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
        sem = asyncio.Semaphore(3)
        async def fetch_n(n):
            url = f"{BASE_URL}sayfa-{n}/"
            async with sem:
                for attempt in range(3):
                    try:
                        return await _fetch_page(url)
                    except Exception as e:
                        print(f"[InceHesap] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        await asyncio.sleep(3)
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
