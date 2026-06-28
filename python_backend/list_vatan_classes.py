import asyncio
from scrapling.fetchers import StealthyFetcher

async def list_classes():
    url = "https://www.vatanbilgisayar.com/oem-paketler/"
    print(f"Fetching {url}...")
    page = await StealthyFetcher.async_fetch(
        url,
        headless=True,
        wait_until="domcontentloaded",
        timeout=60000,
    )
    
    classes = set()
    for el in page.css("*"):
        cls = el.attrib.get("class")
        if cls:
            for c in cls.split():
                classes.add(c)
    
    print("--- Found classes ---")
    relevant = [c for c in classes if any(x in c.lower() for x in ["page", "pagin", "paging", "count"])]
    for c in sorted(relevant):
        print(c)

if __name__ == "__main__":
    asyncio.run(list_classes())
