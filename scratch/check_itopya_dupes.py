import asyncio
import sys
import os
from pathlib import Path

# Add scrapers to path
sys.path.append(str(Path(__file__).parent.parent / "python_backend"))

from scrapers.itopya import scrape_all_pages_async

async def test():
    products = await scrape_all_pages_async()
    print(f"Total products: {len(products)}")
    
    urls = [p['url'] for p in products]
    unique_urls = set(urls)
    print(f"Unique URLs: {len(unique_urls)}")
    
    if len(urls) != len(unique_urls):
        print("!!! DUPLICATES DETECTED !!!")
        import collections
        dupes = [item for item, count in collections.Counter(urls).items() if count > 1]
        print(f"Sample duplicates: {dupes[:5]}")
    else:
        print("No duplicates in the returned list.")

if __name__ == "__main__":
    asyncio.run(test())
