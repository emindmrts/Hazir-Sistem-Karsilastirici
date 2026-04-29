"""
Vatan Bilgisayar scraper - StealthyFetcher
- Düzeltmeler (2026-04-27):
  * PRODUCT_SEL: product-list--list-page -> product-list--grid
  * İsim selector: h3 child değil, h3.product-list__product-name kendisi
  * Pagination: .pagination__item yok; toplam ürün sayısından hesaplanıyor
  * Image: data-src öncelikli (lazyload)
  * Concurrent page fetching with Semaphore(5)
"""
import asyncio
import math
import re
import sys

# Windows cp1254 encoding sorununu coz
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from scrapling.fetchers import StealthyFetcher

STORE = "vatan"
BASE_URL = "https://www.vatanbilgisayar.com/oem-paketler/"
# a.product-list-link doğrudan ürün kartını saran link elementi
PRODUCT_SEL = "a.product-list-link"
PRODUCTS_PER_PAGE = 24


def _parse_price(el) -> float:
    price_el = el.css(".product-list__price").first
    if not price_el:
        return 0.0
    texts = [t.get().strip() for t in price_el.xpath(".//text()") if t.get().strip()]
    raw = "".join(texts)
    # Binlik nokta ve ondalık virgülü temizle
    clean = re.sub(r"[^\d,]", "", raw).replace(",", ".")
    # "52.726" gibi binlik ayracı olan durumları yakala
    # Eğer noktadan sonra 3 rakam varsa binlik ayraçtır
    if re.match(r"^\d+\.\d{3}$", clean):
        clean = clean.replace(".", "")
    try:
        return float(clean)
    except ValueError:
        return 0.0


def _parse_page_products(page) -> list[dict]:
    products = []
    for el in page.css(PRODUCT_SEL):
        # h3.product-list__product-name — h3 KENDİSİ isim elementi
        name_el = el.css("h3.product-list__product-name").first
        if not name_el:
            # Fallback: herhangi bir h3
            name_el = el.css("h3").first
        name = name_el.text.strip() if name_el else "N/A"

        price = _parse_price(el)

        # Lazy-load: data-src öncelikli, yoksa src
        img_el = el.css(".product-list__image-safe img").first
        if img_el:
            image = (
                img_el.attrib.get("data-src")
                or img_el.attrib.get("src")
            )
        else:
            image = None

        href = el.attrib.get("href", "")
        url_product = href if href.startswith("http") else f"https://www.vatanbilgisayar.com{href}"

        spec_items = [p.text.strip() for p in el.css(".productlist_spec ul li p")]

        specs = {
            "CPU": "N/A",
            "Motherboard": "N/A",
            "GPU": "N/A",
            "RAM": "N/A",
            "Storage": "N/A",
        }

        if not spec_items and name:
            cpu_match = re.search(r"(INTEL[\w\s]+|AMD[\w\s]+|INTE\s+U\d[\w\s]+)", name, re.IGNORECASE)
            if cpu_match:
                specs["CPU"] = cpu_match.group(1).strip()
                specs["CPU"] = re.split(r"\s+RTX|\s+RX|\s+GTX|\s+ARC|\s*-", specs["CPU"], flags=re.IGNORECASE)[0].strip()
            
            gpu_match = re.search(r"((?:RTX|GTX|RX|ARC|RADEON)\s*\d+[\w\s]*)", name, re.IGNORECASE)
            if gpu_match:
                specs["GPU"] = gpu_match.group(1).strip()
                specs["GPU"] = re.split(r"\s*-", specs["GPU"], flags=re.IGNORECASE)[0].strip()
                
            storage_match = re.search(r"(\d+\s*(?:GB|TB)\s*(?:M\.2\s*)?(?:SSD|HDD|NVME))", name, re.IGNORECASE)
            if storage_match:
                specs["Storage"] = storage_match.group(1).strip()
                
            ram_match = re.search(r"(\d+\s*GB(?:\s*DDR\d)?\s*RAM|RAM)", name, re.IGNORECASE)
            if ram_match:
                specs["RAM"] = ram_match.group(1).strip()
                
            mb_match = re.search(r"((?:[AHBZX]\d{3}[A-Z]*(?:-\w+)?)(?:\s*DDR\d)?(?:\s*WIFI)?(?:\s*PRO)?(?:\s*PLUS)?)", name, re.IGNORECASE)
            if mb_match:
                specs["Motherboard"] = mb_match.group(1).strip()
        else:
            def find(*kws):
                return next((x for x in spec_items if any(k.lower() in x.lower() for k in kws)), "N/A")

            specs["CPU"] = find("islemci", "cpu", "ryzen", "core", "intel", "amd")
            specs["Motherboard"] = find("anakart", "mb")
            specs["GPU"] = find("rtx", "gtx", "rx ", "arc")
            specs["RAM"] = find("mhz", "ram", "ddr", "cl")
            specs["Storage"] = find("ssd", "m.2", "nvme", "tb")

        products.append({
            "name":  name,
            "price": price,
            "image": image,
            "url":   url_product,
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


def _get_total_pages(first_page) -> int:
    """
    '287 adet ürün bulundu' gibi bir metinden toplam ürün sayısını çekip
    sayfa sayısını hesaplar.
    """
    try:
        # ".result-count" veya benzeri elementleri dene
        for sel in [".result-count", ".product-list-count", ".listing-count"]:
            el = first_page.css(sel).first
            if el:
                m = re.search(r"(\d[\d.]*)", el.text.replace(".", ""))
                if m:
                    total = int(m.group(1))
                    return math.ceil(total / PRODUCTS_PER_PAGE)

        # Tüm sayfada "adet ürün" ifadesini ara
        full_text = first_page.get_all_text() if hasattr(first_page, "get_all_text") else ""
        m = re.search(r"(\d[\d.]*)\s*adet\s*ürün", full_text.replace(".", ""))
        if m:
            total = int(m.group(1))
            return math.ceil(total / PRODUCTS_PER_PAGE)

    except Exception:
        pass

    # Fallback: geleneksel sayfa numaraları varsa
    try:
        nums = [
            int(el.text.strip())
            for el in first_page.css(".pagination__item")
            if el.text.strip().isdigit()
        ]
        if nums:
            return max(nums)
    except Exception:
        pass

    return 1


async def scrape_all_pages_async() -> list[dict]:
    print(f"[Vatan] Ilk sayfa yukleniyor: {BASE_URL}", flush=True)

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
        print(f"[Vatan] Ilk sayfa hatasi: {e}", flush=True)
        return []

    total_pages = _get_total_pages(first_page)
    print(f"[Vatan] {total_pages} sayfa bulundu", flush=True)

    all_products = _parse_page_products(first_page)
    print(f"[Vatan] Sayfa 1: {len(all_products)} urun", flush=True)

    if total_pages > 1:
        sem = asyncio.Semaphore(5)

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
                        pass
                return []

        results = await asyncio.gather(
            *[fetch_n(i) for i in range(2, total_pages + 1)],
            return_exceptions=True,
        )
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
    print(f"vatan_test.json kaydedildi - {len(products)} urun")


