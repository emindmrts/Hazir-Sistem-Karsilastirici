import re
import asyncio
from scrapling import Fetcher
from .utils import (
    extract_specs_from_list,
    extract_specs_from_name,
    merge_specs,
    cacheable_specs,
    load_detail_cache,
    save_detail_cache,
)

STORE = "pckolik"
BASE_URL = "https://pckolik.com.tr/kategori/oem-paketler"
SITE_BASE = "https://pckolik.com.tr"
PRODUCT_SEL = ".product-card"


def _parse_price(card) -> float:
    # PCKolik'te fiyat .price icinde: "26.999,00TL" veya .price-new icinde
    selectors = [".price-new", ".price", ".current-price", ".product-price", ".price-box"]
    raw = ""
    for sel in selectors:
        el = card.css(sel).first
        if el:
            raw = el.get_all_text().strip()
            if raw:
                break

    if not raw:
        all_text = card.get_all_text()
        match = re.search(r"(\d[\d\.]*(?:,\d+)?)\s*(?:TL|₺)", all_text)
        if match:
            raw = match.group(1)

    if not raw:
        return 0.0

    clean = re.sub(r"[^\d,.]", "", raw)
    if "." in clean and "," in clean:
        clean = clean.replace(".", "").replace(",", ".")
    elif "," in clean:
        clean = clean.replace(",", ".")

    try:
        return float(clean)
    except ValueError:
        return 0.0


def _parse_page_products(page) -> list[dict]:
    products = []
    if not page:
        return products

    for card in page.css(PRODUCT_SEL):
        # Link check
        a_el = card.css("a.name").first or card.css("a").first
        href = a_el.attrib.get("href", "") if a_el else ""
        if not href or "javascript" in href.lower():
            continue

        if href and not href.startswith("http"):
            href = f"{SITE_BASE}{'/' if not href.startswith('/') else ''}{href}"

        # Name
        name = "N/A"
        for name_sel in [".name", "a.name", "a.product-name", ".product-title", ".product-name", "h2", "h3"]:
            name_el = card.css(name_sel).first
            if name_el:
                name = name_el.get_all_text().strip()
                if name and name != "N/A":
                    name = name.split('\n')[0].strip()
                    break
        
        # Price extraction
        price = _parse_price(card)

        # Image
        image = None
        for img in card.css("img"):
            src = img.attrib.get("src") or ""
            if not src or src.startswith("/assets/"):
                continue
            if src.endswith(".svg") or src.endswith(".gif"):
                continue
            if "icon" in src.lower():
                continue
            image = f"{SITE_BASE}{src}" if src.startswith("/") else src
            break

        features = [(li.get_all_text() if hasattr(li, 'get_all_text') else li.text).strip() for li in card.css("li")]
        specs = extract_specs_from_list(features)

        if name and name != "N/A":
            name_specs = extract_specs_from_name(f"{name} {href}")
            for k, v in specs.items():
                if v == "N/A" and name_specs.get(k) != "N/A":
                    specs[k] = name_specs[k]

        products.append({
            "name": name,
            "price": price,
            "image": image,
            "url": href,
            "store": STORE,
            "specs": specs,
        })

    return products


def _parse_detail_image(page) -> str | None:
    """Detail sayfasindaki kasa urun gorselini dondurur.

    pckolik listing'inde bileşen (PSU/MB/RAM) görselleri gösterilir; gercek
    sistem/kasa gorseli yalnizca detay sayfasinda ``.case-img-crop img`` icinde
    bulunur.
    """
    if not page:
        return None
    for sel in (".case-img-crop img", ".case-img img", "img.case-img",
                ".product-gallery img", ".product-image img"):
        img = page.css(sel).first
        if img:
            src = img.attrib.get("src") or img.attrib.get("data-src") or ""
            if src and not src.endswith(".svg") and "icon" not in src.lower():
                return src
    return None


_SECTION_SPEC_MAP = {
    "guc kaynaklari": "PSU",
    "güç kaynaklari": "PSU",
    "bilgisayar kasalari": "Case",
    "bilgisayar kasaları": "Case",
    "islemci sogutma sistemleri": "Cooler",
    "işlemci soğutma sistemleri": "Cooler",
    "kasa fanlari": None,        # case fans ≠ CPU cooler
    "kasa fanları": None,
    "islemci": "CPU",
    "işlemci": "CPU",
    "ekran karti": "GPU",
    "ekran kartı": "GPU",
    "ram - bellek": "RAM",
}


def _parse_detail_configurator(page) -> dict[str, str]:
    """Extract components from the builder configurator panel by section label.

    Returns ``{spec_key: product_text}`` using the section label (via
    ``_SECTION_SPEC_MAP``) rather than keyword-classifying the product text,
    because some product names omit cooler keywords like "sogutucu".
    """
    if not page:
        return {}

    _tr = str.maketrans({
        "ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c",
        "İ": "i", "Ğ": "g", "Ü": "u", "Ş": "s", "Ö": "o", "Ç": "c",
    })

    result = {}
    for anchor in page.css("a.builder-product-button-anchor"):
        raw = anchor.get_all_text().strip()
        if not raw:
            continue
        lines = [l.strip() for l in raw.split("\n") if l.strip()]
        if len(lines) < 2:
            continue
        section_label = lines[0]
        n_label = section_label.translate(_tr).lower()
        prod_parts = [l for l in lines[1:] if l not in ("Değiştir", "Degistir")]
        prod_text = " ".join(prod_parts).strip()
        if not prod_text or "urun secilmedi" in prod_text.lower() or "ürün seçilmedi" in prod_text.lower():
            continue
        cat = _SECTION_SPEC_MAP.get(n_label)
        if cat:
            result[cat] = prod_text
    return result


async def _fetch_product_details(product: dict, fetcher, cache=None) -> dict:
    """Detail'den kasa gorselini ve configurator bilesen bilgilerini cek.

    Image cache'lenir (URL kararli).  Eksik spec'ler (PSU/Case/Cooler)
    detail'deki builder configurator panelinden doldurulur.
    """
    url = product.get("url")
    if not url:
        return product

    if cache is not None and url in cache:
        cached = cache[url]
        if cached.get("image"):
            product["image"] = cached["image"]
        if cached.get("specs"):
            merge_specs(product["specs"], cached["specs"])
        return product

    def sync_fetch():
        try:
            return fetcher.get(url)
        except Exception:
            return None

    for attempt in range(3):
        page = await asyncio.to_thread(sync_fetch)
        if not page:
            await asyncio.sleep(1 + attempt)
            continue
        if getattr(page, "status_code", 200) == 429:
            await asyncio.sleep(4 + attempt * 4)
            continue
        image = _parse_detail_image(page)
        if image:
            if image.startswith("/"):
                image = f"{SITE_BASE}{image}"
            product["image"] = image
        config_specs = _parse_detail_configurator(page)
        if config_specs:
            for k, v in config_specs.items():
                product["specs"][k] = v
        if product["specs"].get("Cooler", "N/A") == "N/A":
            product["specs"]["Cooler"] = "Stok Soğutucu"
        if cache is not None:
            cache[url] = {
                "image": image,
                "specs": cacheable_specs(product["specs"]),
            }
        break
    return product


async def scrape_all_pages_async() -> list[dict]:
    print(f"[PCKolik] Ilk sayfa yukleniyor: {BASE_URL}", flush=True)
    fetcher = Fetcher()

    def fetch_sync(url):
        try:
            return fetcher.get(url)
        except Exception as e:
            print(f"[PCKolik] Fetch hatasi: {e}", flush=True)
            return None

    first_page = await asyncio.to_thread(fetch_sync, BASE_URL)
    if not first_page:
        print("[PCKolik] Ilk sayfa yuklenemedi", flush=True)
        return []

    try:
        nums = [int(a.text.strip()) for a in first_page.css(".pagination a, .page-link") if a.text.strip().isdigit()]
        total_pages = max(nums) if nums else 1
    except Exception:
        total_pages = 1

    print(f"[PCKolik] {total_pages} sayfa bulundu", flush=True)
    all_products = _parse_page_products(first_page)
    seen_urls = {p["url"] for p in all_products if p.get("url")}
    print(f"[PCKolik] Sayfa 1: {len(all_products)} urun", flush=True)

    if total_pages > 1:
        sem = asyncio.Semaphore(2)

        async def fetch_n(n):
            url = f"{BASE_URL}?page={n}"
            async with sem:
                for attempt in range(3):
                    try:
                        page = await asyncio.to_thread(fetch_sync, url)
                        products = _parse_page_products(page)
                        if products:
                            print(f"[PCKolik] Sayfa {n}: {len(products)} urun", flush=True)
                            return products
                    except Exception as e:
                        print(f"[PCKolik] Sayfa {n} hata (deneme {attempt+1}): {e}", flush=True)
                        await asyncio.sleep(2)
                return []

        results = await asyncio.gather(*[fetch_n(i) for i in range(2, total_pages + 1)], return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                for p in r:
                    if p["url"] not in seen_urls:
                        seen_urls.add(p["url"])
                        all_products.append(p)

    print(f"[PCKolik] Toplam {len(all_products)} urun cekildi", flush=True)

    # Detay cekimi: listing gorselleri bileşen, kasa gorseli detayda.
    cache = load_detail_cache()
    cached = sum(1 for p in all_products if p.get("url") in cache)
    print(f"[PCKolik] {len(all_products)} urun icin kasa gorseli cekiliyor "
          f"({cached} onbellekten)...", flush=True)

    sem = asyncio.Semaphore(8)

    async def fetch_detail_with_sem(prod):
        async with sem:
            was_cached = prod.get("url") in cache
            res = await _fetch_product_details(prod, fetcher, cache)
            if not was_cached:
                await asyncio.sleep(0.1)
            return res

    all_products = await asyncio.gather(*[fetch_detail_with_sem(p) for p in all_products])
    save_detail_cache(cache)

    print(f"[PCKolik] Detay cekimi tamamlandi", flush=True)
    return all_products


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    print(f"Bitti: {len(products)} urun.")



