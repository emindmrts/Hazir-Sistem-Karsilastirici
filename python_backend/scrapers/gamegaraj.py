import re
"""
GameGaraj scraper - Scrapling Fetcher (static HTML)
Scrapling 0.4.7 API: css().first, el.attrib.get()
"""
from scrapling import Fetcher
from .utils import extract_specs_from_list, extract_specs_from_name


def _parse_products(page) -> list[dict]:
    products = []
    for card in page.css("div[data-product-id]"):
        title_el = card.css("a.text-xl.font-semibold.text-gray-900").first
        name = title_el.get_all_text().strip() if title_el else "N/A"
        href = title_el.attrib.get("href", "") if title_el else ""
        link = f"https://www.gamegaraj.com{href}" if href and not href.startswith("http") else href

        img_el = (card.css("picture img").first) or (card.css("img").first)
        image = img_el.attrib.get("src") if img_el else None

        price_el = card.css("p.text-3xl.font-extrabold").first
        price = 0.0
        if price_el:
            raw = price_el.text.strip().replace(".", "").replace(",", ".")
            raw = re.sub(r"[^\d.]", "", raw)
            try:
                price = float(raw)
            except ValueError:
                price = 0.0

        spec_items = [(li.get_all_text() if hasattr(li, 'get_all_text') else li.text).strip() for li in card.css("ul.list-disc li")]
        specs = extract_specs_from_list(spec_items)

        if name:
            name_specs = extract_specs_from_name(name)
            for k, v in specs.items():
                if v == "N/A" and name_specs.get(k) != "N/A":
                    specs[k] = name_specs[k]



        products.append({
            "name": name,
            "price": price,
            "image": image,
            "url": link,
            "store": "gameGaraj",
            "specs": specs,
        })
    return products


def scrape_all_pages() -> list[dict]:
    fetcher = Fetcher()
    base_url = "https://www.gamegaraj.com/oem-paketler/"

    print(f"[GameGaraj] Fetching {base_url}")
    page = fetcher.get(base_url)

    all_products = []
    seen_urls = set()
    page_num = 1
    
    while True:
        url = f"{base_url}?page={page_num}" if page_num > 1 else base_url
        print(f"[GameGaraj] Sayfa {page_num}: {url}")
        
        page = fetcher.get(url)
        if not page:
            break
            
        batch = _parse_products(page)
        if not batch:
            break
            
        new_count = 0
        for p in batch:
            if p["url"] not in seen_urls:
                seen_urls.add(p["url"])
                all_products.append(p)
                new_count += 1
                
        if new_count == 0:
            break
            
        page_num += 1

    print(f"[GameGaraj] Toplam {len(all_products)} urun cekildi")
    return all_products


if __name__ == "__main__":
    import json
    products = scrape_all_pages()
    with open("gamegaraj_test.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("gamegaraj_test.json kaydedildi")


