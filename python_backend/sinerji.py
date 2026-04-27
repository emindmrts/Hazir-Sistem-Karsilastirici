import re
"""
Sinerji scraper - Fetcher (static, no JS needed)
"""
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

            spec_items = [(li.get_all_text() if hasattr(li, 'get_all_text') else li.text).strip() for li in el.css(".technicalSpecs li")]
            specs = {
                "CPU": "N/A",
                "Motherboard": "N/A",
                "GPU": "N/A",
                "RAM": "N/A",
                "Storage": "N/A",
            }

            if 'spec_items' in locals() and spec_items:
                def find(*kws):
                    return next((x for x in spec_items if any(k.lower() in x.lower() for k in kws)), "N/A")
                specs["CPU"] = find("islemci", "cpu", "ryzen", "core", "intel", "amd", "i3", "i5", "i7", "i9", "r3", "r5", "r7", "r9")
                specs["Motherboard"] = find("anakart", "mb", "b450", "b550", "a520", "h610", "b650", "a620", "b760", "z790", "b660", "x670")
                specs["GPU"] = find("rtx", "gtx", "rx ", "arc", "radeon", "ekran")
                specs["RAM"] = find("mhz", "ram", "ddr", "cl")
                specs["Storage"] = find("ssd", "m.2", "nvme", "tb")

            if name:
                if specs["CPU"] == "N/A":
                    cpu_match = re.search(r"(INTEL[\w\s]+|AMD[\w\s]+|INTE\s+U\d[\w\s]+)", name, re.IGNORECASE)
                    if cpu_match:
                        specs["CPU"] = cpu_match.group(1).strip()
                        specs["CPU"] = re.split(r"\s+RTX|\s+RX|\s+GTX|\s+ARC|\s*-", specs["CPU"], flags=re.IGNORECASE)[0].strip()
                
                if specs["GPU"] == "N/A":
                    gpu_match = re.search(r"((?:RTX|GTX|RX|ARC|RADEON)\s*\d+[\w\s]*)", name, re.IGNORECASE)
                    if gpu_match:
                        specs["GPU"] = gpu_match.group(1).strip()
                        specs["GPU"] = re.split(r"\s*-", specs["GPU"], flags=re.IGNORECASE)[0].strip()
                    
                if specs["Storage"] == "N/A":
                    storage_match = re.search(r"(\d+\s*(?:GB|TB)\s*(?:M\.2\s*)?(?:SSD|HDD|NVME))", name, re.IGNORECASE)
                    if storage_match:
                        specs["Storage"] = storage_match.group(1).strip()
                    
                if specs["RAM"] == "N/A":
                    ram_match = re.search(r"(\d+\s*GB(?:\s*DDR\d)?\s*RAM|RAM)", name, re.IGNORECASE)
                    if ram_match:
                        specs["RAM"] = ram_match.group(1).strip()
                    
                if specs["Motherboard"] == "N/A":
                    mb_match = re.search(r"((?:[AHBZX]\d{3}[A-Z]*(?:-\w+)?)(?:\s*DDR\d)?(?:\s*WIFI)?(?:\s*PRO)?(?:\s*PLUS)?)", name, re.IGNORECASE)
                    if mb_match:
                        specs["Motherboard"] = mb_match.group(1).strip()
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
