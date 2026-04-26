import asyncio
from itopya import _fetch_page

async def test():
    products = await _fetch_page("https://www.itopya.com/oem-paketler")
    for p in products[:5]:
        print(f"Name: {p['name']}, Price: {p['price']}")

asyncio.run(test())
