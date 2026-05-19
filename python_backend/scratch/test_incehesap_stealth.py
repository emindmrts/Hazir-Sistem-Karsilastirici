
import asyncio
from scrapling.fetchers import StealthyFetcher
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

async def test_incehesap_stealth():
    url = "https://www.incehesap.com/ferzex-gold-oem-paket-fiyati-50710/"
    page = await StealthyFetcher.async_fetch(url, headless=True, network_idle=True, timeout=30000)
    if not page: return
        
    text = page.get_all_text()
    with open("scratch/incehesap_render.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("Wrote to scratch/incehesap_render.txt")

if __name__ == "__main__":
    asyncio.run(test_incehesap_stealth())