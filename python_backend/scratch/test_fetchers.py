import asyncio
from scrapling import Fetcher

async def test():
    fetcher = Fetcher()
    
    print("Testing PCKolik...")
    p = fetcher.get("https://pckolik.com.tr/kategori/oem-paketler")
    if p:
        cards = p.css(".product-card")
        print(f"PCKolik static fetched successfully. Cards found: {len(cards)}")
    else:
        print("PCKolik static fetch failed.")

    print("\nTesting GamingGen...")
    p = fetcher.get("https://www.gaming.gen.tr/kategori/hazir-sistemler/")
    if p:
        cards = p.css("li.product")
        print(f"GamingGen static fetched successfully. Cards found: {len(cards)}")
    else:
        print("GamingGen static fetch failed.")

    print("\nTesting Tebilon...")
    p = fetcher.get("https://www.tebilon.com/hazir-sistemler/")
    if p:
        cards = p.css(".showcase__product")
        print(f"Tebilon static fetched successfully. Cards found: {len(cards)}")
    else:
        print("Tebilon static fetch failed.")

if __name__ == "__main__":
    asyncio.run(test())
