import asyncio
from scrapling.fetchers import StealthyFetcher

async def f():
    p = await StealthyFetcher.async_fetch('https://www.gaming.gen.tr/kategori/hazir-sistemler/', headless=True, timeout=20000)
    if p and p.css('li.product img'):
        print(p.css('li.product img').first.attrib)
    else:
        print('No image found')

if __name__ == "__main__":
    asyncio.run(f())
