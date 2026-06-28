import sys
import asyncio
from scrapling import Fetcher

sys.stdout.reconfigure(encoding="utf-8")

async def test_gaminggen_pagination():
    fetcher = Fetcher()
    base_url = "https://www.gaming.gen.tr/kategori/hazir-sistemler/"
    
    print("Fetching Page 1...")
    p1 = await asyncio.to_thread(fetcher.get, base_url)
    if not p1:
        print("Page 1 failed.")
        return
        
    cards1 = p1.css("li.product")
    print(f"Page 1 found {len(cards1)} products.")
    
    print("Fetching Page 2...")
    p2 = await asyncio.to_thread(fetcher.get, f"{base_url}page/2/")
    if not p2:
        print("Page 2 failed.")
        return
        
    cards2 = p2.css("li.product")
    print(f"Page 2 found {len(cards2)} products.")
    
if __name__ == "__main__":
    asyncio.run(test_gaminggen_pagination())
