import asyncio
from scrapling.fetchers import StealthyFetcher

async def f():
    print("Fetching itopya...")
    p = await StealthyFetcher.async_fetch('https://www.itopya.com/oem-paketler', headless=True, wait_selector='.product, .product-card', timeout=20000)
    print("Found products:", len(p.css('.product')) if p else 'None')

if __name__ == "__main__":
    asyncio.run(f())
