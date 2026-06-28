import sys
from scrapling import Fetcher

sys.stdout.reconfigure(encoding="utf-8")

fetcher = Fetcher()
print("Fetching PCKolik...")
page = fetcher.get("https://pckolik.com.tr/kategori/oem-paketler")
if not page:
    print("Failed to fetch.")
    sys.exit(1)

cards = page.css(".product-card")
print(f"Cards found: {len(cards)}")

if len(cards) > 0:
    first_card = cards[0]
    print("--- FIRST CARD HTML ---")
    print(first_card.get_all_text()[:500])
    print("--- FIRST CARD ATTRIBUTES ---")
    print(first_card.attrib)
    print("--- FIRST CARD A TAG ---")
    a_tag = first_card.css("a").first
    if a_tag:
        print(a_tag.attrib)
        print(a_tag.get_all_text())
    
    print("--- SELECTORS TEST ---")
    # Let's see what selectors match
    print("a.product-name:", [el.get_all_text().strip() for el in first_card.css("a.product-name")])
    print(".product-title:", [el.get_all_text().strip() for el in first_card.css(".product-title")])
    print(".product-name:", [el.get_all_text().strip() for el in first_card.css(".product-name")])
    print("h2:", [el.get_all_text().strip() for el in first_card.css("h2")])
    print("h3:", [el.get_all_text().strip() for el in first_card.css("h3")])
    print(".price:", [el.get_all_text().strip() for el in first_card.css(".price")])
    print(".current-price:", [el.get_all_text().strip() for el in first_card.css(".current-price")])

