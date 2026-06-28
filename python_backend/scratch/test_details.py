import asyncio
from scrapling import Fetcher

def test_details():
    fetcher = Fetcher()
    
    print("=== PCKolik ===")
    p = fetcher.get("https://pckolik.com.tr/kategori/oem-paketler")
    if p:
        cards = p.css(".product-card")
        print(f"PCKolik: {len(cards)} cards found.")
        for i, card in enumerate(cards[:3]):
            name_el = card.css(".product-name, a.product-name, h2, h3").first
            name = name_el.get_all_text().strip() if name_el else "N/A"
            price_el = card.css(".price, .current-price").first
            price = price_el.get_all_text().strip() if price_el else "N/A"
            print(f"  {i+1}. Name: {name} | Price: {price}")
    else:
        print("PCKolik fetch failed.")

    print("\n=== GamingGen ===")
    p = fetcher.get("https://www.gaming.gen.tr/kategori/hazir-sistemler/")
    if p:
        cards = p.css("li.product")
        print(f"GamingGen: {len(cards)} cards found.")
        for i, card in enumerate(cards[:3]):
            title_el = card.css(".pc-specs-title").first
            name = title_el.get_all_text().strip() if title_el else "N/A"
            price_el = card.css(".price").first
            price = price_el.get_all_text().strip() if price_el else "N/A"
            print(f"  {i+1}. Name: {name} | Price: {price}")
    else:
        print("GamingGen fetch failed.")

    print("\n=== Tebilon ===")
    p = fetcher.get("https://www.tebilon.com/hazir-sistemler/")
    if p:
        cards = p.css(".showcase__product")
        print(f"Tebilon: {len(cards)} cards found.")
        for i, card in enumerate(cards[:3]):
            name_el = card.css(".showcase__title a").first
            name = name_el.get_all_text().strip() if name_el else "N/A"
            price_el = card.css(".newPrice").first
            price = price_el.get_all_text().strip() if price_el else "N/A"
            print(f"  {i+1}. Name: {name} | Price: {price}")
    else:
        print("Tebilon fetch failed.")

if __name__ == "__main__":
    test_details()
