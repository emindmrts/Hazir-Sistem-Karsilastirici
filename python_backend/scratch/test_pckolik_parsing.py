import sys
import re
from scrapling import Fetcher
from scrapers.utils import extract_specs_from_list, extract_specs_from_name

sys.stdout.reconfigure(encoding="utf-8")

STORE = "pckolik"
SITE_BASE = "https://pckolik.com.tr"
PRODUCT_SEL = ".product-card"

def _parse_price(card) -> float:
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

def test_parse():
    fetcher = Fetcher()
    page = fetcher.get("https://pckolik.com.tr/kategori/oem-paketler")
    if not page:
        print("Page fetch failed.")
        return

    cards = page.css(PRODUCT_SEL)
    print(f"Cards found: {len(cards)}")
    
    products = []
    for card in cards[:5]:
        a_el = card.css("a").first
        href = a_el.attrib.get("href", "") if a_el else ""
        if not href or "javascript" in href.lower():
            # Check other link
            a_el = card.css("a.name").first
            href = a_el.attrib.get("href", "") if a_el else ""

        if href and not href.startswith("http"):
            href = f"{SITE_BASE}{'/' if not href.startswith('/') else ''}{href}"

        name = "N/A"
        for name_sel in [".name", "a.name", "a.product-name", ".product-title", ".product-name", "h2", "h3"]:
            name_el = card.css(name_sel).first
            if name_el:
                name = name_el.get_all_text().strip()
                if name and name != "N/A":
                    name = name.split('\n')[0].strip()
                    break

        price = _parse_price(card)
        
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
            name_specs = extract_specs_from_name(name)
            for k, v in specs.items():
                if v == "N/A" and name_specs.get(k) != "N/A":
                    specs[k] = name_specs[k]

        products.append({
            "name": name,
            "price": price,
            "image": image,
            "url": href,
            "store": STORE,
            "specs": specs
        })

    for i, p in enumerate(products):
        print(f"Product {i+1}:")
        print(f"  Name: {p['name']}")
        print(f"  Price: {p['price']}")
        print(f"  Url: {p['url']}")
        print(f"  Image: {p['image']}")
        print(f"  Specs: {p['specs']}")

if __name__ == "__main__":
    test_parse()
