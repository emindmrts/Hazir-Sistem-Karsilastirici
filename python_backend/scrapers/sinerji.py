import re
"""
Sinerji scraper - Fetcher (static, no JS needed)
"""
from scrapling import Fetcher
from .utils import extract_specs_from_list, extract_specs_from_name


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

    all_products = []
    seen_urls = set()
    page_num = 1

    while True:
        url = f"{base_url}?px={page_num}" if page_num > 1 else base_url
        print(f"[Sinerji] Sayfa {page_num}: {url}")
        
        page = fetcher.get(url, stealthy_headers=True)
        if not page:
            break
            
        elements = page.css(".product")
        if not elements:
            break
            
        new_count = 0
        for el in elements:
            name_el = el.css(".titleShort").first or el.css(".title a").first
            name = name_el.get_all_text().strip() if name_el else "N/A"
            
            link_el = el.css(".title a").first
            link = link_el.attrib.get("href") if link_el else None
            
            if link in seen_urls:
                continue
            if link:
                seen_urls.add(link)

            price = _parse_price(el)
            img_el = el.css(".img img").first
            image = img_el.attrib.get("src") if img_el else None

            spec_items = [s.get_all_text().strip() for s in el.css(".technicalSpecsWithLogo")]
            specs = extract_specs_from_list(spec_items)

            if name:
                name_specs = extract_specs_from_name(name)
                for k, v in specs.items():
                    if v == "N/A" and name_specs.get(k) != "N/A":
                        specs[k] = name_specs[k]
                        
            all_products.append({
                "name": name,
                "price": price,
                "image": image,
                "url": link,
                "store": "sinerji",
                "specs": specs,
            })
            new_count += 1
            
        if new_count == 0:
            break
            
        page_num += 1

    print(f"[Sinerji] Toplam {len(all_products)} urun cekildi")
    return all_products


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    with open("sinerji_test.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("sinerji_test.json kaydedildi")
