"""
Itopya scraper - Scrapling StealthyFetcher (JS rendering required)
Scrapling 0.4.7 API: css().first, el.attrib.get()
"""
import asyncio
import re
from scrapling.fetchers import StealthyFetcher

async def _fetch_page(url: str) -> list[dict]:
    page = await StealthyFetcher.async_fetch(
        url,
        headless=True,
        wait_until="domcontentloaded",
        timeout=60000,
        wait_selector=".product",
        wait_selector_state="attached",
    )

    products = []
    for el in page.css(".product"):
        # İsim & link
        link_els = [a for a in el.css("a") if a.text.strip()]
        name_el = link_els[0] if link_els else None
        name = name_el.text.strip() if name_el else "N/A"
        link = name_el.attrib.get("href") if name_el else None

        # Resim
        img_el = el.css("img").first
        image = (img_el.attrib.get("data-src") or img_el.attrib.get("src")) if img_el else None

        # Fiyat
        price_el = (
            el.css(".product-price strong").first
            or el.css(".product-price").first
            or el.css(".amount strong").first
            or el.css(".amount").first
            or el.css(".price-container strong").first
            or el.css(".price-container").first
        )
        
        price_text = "0"
        if price_el:
            price_text = price_el.text.strip()
            if not price_text and price_el.xpath("string()"):
                 price_text = price_el.xpath("string()").get() or "0"

        price_clean = re.sub(r"[^\d,]", "", price_text).replace(",", ".")
        try:
            price = float(price_clean)
        except ValueError:
            price = 0.0

        spec_items = [li.text.strip() for li in el.css(".product-block-feature li, .advice-system-feature p")]
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
            "url": link,
            "store": "itopya",
            "specs": specs,
        })
    return products

async def scrape_all_pages_async() -> list[dict]:
    base_url = "https://www.itopya.com/oem-paketler"
    all_products = []
    
    # Cloudflare korumasi yuzunden tek tek cok yavas oluyor
    # Semaphore ile ayni anda 3 sayfa isleyerek inanilmaz hizlandiriyoruz
    sem = asyncio.Semaphore(3)

    async def fetch_with_sem(page_num: int):
        url = f"{base_url}?pg={page_num}"
        async with sem:
            print(f"[Itopya] Sayfa {page_num} taraniyor...", flush=True)
            for attempt in range(3):
                try:
                    products = await _fetch_page(url)
                    print(f"[Itopya] Sayfa {page_num} basarili ({len(products)} urun)", flush=True)
                    return products
                except Exception as e:
                    print(f"[Itopya] Sayfa {page_num} Hata (deneme {attempt + 1}): {e}", flush=True)
                    await asyncio.sleep(5)
            return []

    tasks = [fetch_with_sem(i) for i in range(1, 11)]
    results = await asyncio.gather(*tasks)

    for products in results:
        all_products.extend(products)

    print(f"[Itopya] Toplam {len(all_products)} urun cekildi", flush=True)
    return all_products

def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    with open("itopya_test.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("itopya_test.json kaydedildi")
