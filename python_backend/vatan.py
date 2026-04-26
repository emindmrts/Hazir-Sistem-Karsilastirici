"""
Vatan Bilgisayar scraper - StealthyFetcher
- wait_selector artik product elementini bekliyor (pagination degil)
- Concurrent page fetching with Semaphore(3)
- Price extraction fix: text() ile nested strong dahil tum text
"""
import asyncio
import re
from scrapling.fetchers import StealthyFetcher

STORE = "vatan"
BASE_URL = "https://www.vatanbilgisayar.com/oem-paketler/"
PRODUCT_SEL = ".product-list.product-list--list-page .product-list-link"


def _parse_price(el) -> float:
    price_el = el.css(".product-list__price").first
    if not price_el:
        return 0.0
    # Try direct text first, then all children text
    texts = [t.get().strip() for t in price_el.xpath(".//text()") if t.get().strip()]
    raw = "".join(texts)
    clean = re.sub(r"[^\d,]", "", raw).replace(",", ".")
    try:
        return float(clean)
    except ValueError:
        return 0.0


def _parse_page_products(page) -> list[dict]:
    products = []
    for el in page.css(PRODUCT_SEL):
        name_el = el.css(".product-list__product-name h3").first
        name = name_el.text.strip() if name_el else "N/A"

        price = _parse_price(el)

        img_el = el.css(".product-list__image-safe img").first
        image = (img_el.attrib.get("src") or img_el.attrib.get("data-src")) if img_el else None

        href = el.attrib.get("href", "")
        url_product = href if href.startswith("http") else f"https://www.vatanbilgisayar.com{href}"

        spec_items = [p.text.strip() for p in el.css(".productlist_spec ul li p")]
        def find(*kws):
            return next((x for x in spec_items if any(k.lower() in x.lower() for k in kws)), "N/A")

        specs = {
            "CPU": find("islemci", "cpu", "ryzen", "core", "intel", "amd"),
            "Motherboard": find("anakart", "mb"),
            "GPU": find("rtx", "gtx", "rx ", "arc"),
            "RAM": find("mhz", "ram", "ddr", "cl"),
            "Storage": find("ssd", "m.2", "nvme", "tb"),
        }

        products.append({
            "name": name,
            "price": price,
            "image": image,
            "url": url_product,
            "store": STORE,
            "specs": specs,
        })
    return products


async def _fetch_page(url: str) -> list[dict]:
    page = await StealthyFetcher.async_fetch(
        url,
        headless=True,
        wait_until="domcontentloaded",
        timeout=60000,
        wait_selector=".product-list-link",
        wait_selector_state="attached",
    )
    return _parse_page_products(page)


async def scrape_all_pages_async() -> list[dict]:
    print(f"[Vatan] Ilk sayfa yukleniyor: {BASE_URL}", flush=True)

    # Ilk sayfayi urunler icin bekle, pagination icin degil
    try:
        first_page = await StealthyFetcher.async_fetch(
            BASE_URL,
            headless=True,
            wait_until="domcontentloaded",
            timeout=60000,
            wait_selector=".product-list-link",
            wait_selector_state="attached",
        )
    except Exception as e:
        print(f"[Vatan] Ilk sayfa hatasi: {e}", flush=True)
        return []

    # Pagination - try/except ile, yoksa 1 sayfa
    try:
        nums = [int(el.text.strip()) for el in first_page.css(".pagination__item") if el.text.strip().isdigit()]
        total_pages = max(nums) if nums else 1
    except Exception:
        total_pages = 1

    print(f"[Vatan] {total_pages} sayfa bulundu", flush=True)

    # Ilk sayfayi direk parse et
    all_products = _parse_page_products(first_page)
    print(f"[Vatan] Sayfa 1: {len(all_products)} urun", flush=True)

    if total_pages > 1:
        sem = asyncio.Semaphore(3)

        async def fetch_n(n):
            url = f"{BASE_URL}?page={n}"
            async with sem:
                print(f"[Vatan] Sayfa {n} taraniyor...", flush=True)
                for attempt in range(3):
                    try:
                        products = await _fetch_page(url)
                        print(f"[Vatan] Sayfa {n}: {len(products)} urun", flush=True)
                        return products
                    except Exception as e:
                        print(f"[Vatan] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        await asyncio.sleep(3)
                return []

        results = await asyncio.gather(*[fetch_n(i) for i in range(2, total_pages + 1)], return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                all_products.extend(r)

    print(f"[Vatan] Toplam {len(all_products)} urun cekildi", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    with open("vatan_test.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("vatan_test.json kaydedildi")
