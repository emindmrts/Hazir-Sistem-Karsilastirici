"""
Sinerji scraper - Fetcher (static, no JS needed)
"""
import re
from scrapling import Fetcher


def _parse_price(el) -> float:
    price_el = el.css(".price").first
    if not price_el:
        return 0.0
    texts = [t.get().strip() for t in price_el.xpath(".//text()") if t.get().strip()]
    raw = "".join(texts)
    clean = re.sub(r"[^\d,]", "", raw).replace(",", ".")
    try:
        return float(clean)
    except ValueError:
        return 0.0


def scrape_all_pages() -> list[dict]:
    fetcher = Fetcher()
    base_url = "https://www.sinerji.gen.tr/oyun-icin-oem-paketler-c-2202"

    print(f"[Sinerji] Fetching {base_url}")
    page = fetcher.get(base_url, stealthy_headers=True)

    # Toplam sayfa sayisini bul
    paging_links = page.css(".paging a")
    nums = [int(a.text.strip()) for a in paging_links if a.text.strip().isdigit()]
    total_pages = max(nums) if nums else 1
    print(f"[Sinerji] {total_pages} sayfa bulundu")

    all_products = []

    for i in range(1, total_pages + 1):
        url = f"{base_url}?px={i}" if i > 1 else base_url
        print(f"[Sinerji] Sayfa {i}: {url}")
        if i > 1:
            page = fetcher.get(url, stealthy_headers=True)

        for el in page.css(".product"):
            name_el = el.css(".title a").first
            name = name_el.text.strip() if name_el else "N/A"
            link = name_el.attrib.get("href") if name_el else None

            price = _parse_price(el)

            img_el = el.css(".img img").first
            image = img_el.attrib.get("src") if img_el else None

            spec_items = [li.text.strip() for li in el.css(".technicalSpecs li")]
            def find(*kws):
                return next((x for x in spec_items if any(k.lower() in x.lower() for k in kws)), "N/A")

            specs = {
                "CPU": find("islemci", "cpu", "ryzen", "core", "intel", "amd"),
                "Motherboard": find("anakart", "mb"),
                "GPU": find("rtx", "gtx", "rx ", "arc"),
                "RAM": find("mhz", "ram", "ddr", "cl"),
                "Storage": find("ssd", "m.2", "nvme", "tb"),
            }

            all_products.append({
                "name": name,
                "price": price,
                "image": image,
                "url": link,
                "store": "sinerji",
                "specs": specs,
            })

    print(f"[Sinerji] Toplam {len(all_products)} urun cekildi")
    return all_products


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    with open("sinerji_test.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("sinerji_test.json kaydedildi")
