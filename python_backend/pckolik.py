"""
PCKolik scraper - StealthyFetcher
- wait_selector artik .product-card (pagination degil)
- Concurrent page fetching with Semaphore(3)
- Price extraction fix: xpath text() ile nested element dahil
"""
import asyncio
import re
from scrapling.fetchers import StealthyFetcher

STORE = "pckolik"
BASE_URL = "https://pckolik.com.tr/kategori/oem-paketler"
PRODUCT_SEL = ".product-card"


def _parse_price(card) -> float:
    price_el = card.css(".product-price").first
    if not price_el:
        return 0.0
    # strong varsa oradan al
    strong = price_el.css("strong").first
    target = strong if strong else price_el
    texts = [t.get().strip() for t in target.xpath(".//text()") if t.get().strip()]
    raw = "".join(texts)
    clean = re.sub(r"[^\d,]", "", raw).replace(",", ".")
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

        features = [li.text.strip() for li in card.css("li")]
        def find(*kws):
            return next((f for f in features if any(k.lower() in f.lower() for k in kws)), None)

        specs = {
            "CPU": find("ryzen", "core", "islemci"),
            "GPU": find("rx ", "gtx", "rtx", "arc"),
            "RAM": find("ram"),
            "Storage": find("ssd", "nvme"),
            "Motherboard": find("anakart"),
        }

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
        wait_until="domcontentloaded",
        timeout=60000,
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
            wait_until="domcontentloaded",
            timeout=60000,
            wait_selector=PRODUCT_SEL,
            wait_selector_state="attached",
        )
    except Exception as e:
        print(f"[PCKolik] Ilk sayfa hatasi: {e}", flush=True)
        return []

    try:
        nums = [int(a.text.strip()) for a in first_page.css(".pagination a") if a.text.strip().isdigit()]
        total_pages = max(nums) if nums else 1
    except Exception:
        total_pages = 1

    print(f"[PCKolik] {total_pages} sayfa bulundu", flush=True)

    all_products = _parse_page_products(first_page)
    print(f"[PCKolik] Sayfa 1: {len(all_products)} urun", flush=True)

    if total_pages > 1:
        sem = asyncio.Semaphore(3)

        async def fetch_n(n):
            url = f"{BASE_URL}?page={n}"
            async with sem:
                print(f"[PCKolik] Sayfa {n} taraniyor...", flush=True)
                for attempt in range(3):
                    try:
                        products = await _fetch_page(url)
                        print(f"[PCKolik] Sayfa {n}: {len(products)} urun", flush=True)
                        return products
                    except Exception as e:
                        print(f"[PCKolik] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        await asyncio.sleep(3)
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
