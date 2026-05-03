
import asyncio
from scrapling.fetchers import StealthyFetcher
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

async def test():
    url = "https://pckolik.com.tr/kategori/oem-paketler"
    page = await StealthyFetcher.async_fetch(url, headless=True, wait_until="domcontentloaded", timeout=60000, wait_selector=".product-card", wait_selector_state="attached")
    if not page: return
    
    cards = page.css(".product-card")
    print(f"Found {len(cards)} cards")
    
    for card in cards[:3]:
        print("--- Card ---")
        imgs = card.css("img")
        for img in imgs:
            src = img.attrib.get("src", "")
            data_src = img.attrib.get("data-src", "")
            alt = img.attrib.get("alt", "")
            classes = img.attrib.get("class", "")
            print(f"  img src={src[:80]} data-src={data_src[:80]} alt={alt[:30]} class={classes}")

if __name__ == "__main__":
    asyncio.run(test())
