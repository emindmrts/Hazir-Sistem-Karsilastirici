import asyncio
from scrapling.fetchers import StealthyFetcher

async def check_page_2():
    url = "https://www.vatanbilgisayar.com/oem-paketler/?page=2"
    print(f"Fetching {url}...")
    page = await StealthyFetcher.async_fetch(
        url,
        headless=True,
        wait_until="domcontentloaded",
        timeout=60000,
    )
    
    products = page.css(".product-list-link")
    print(f"Found {len(products)} products on page 2")
    if len(products) > 0:
        first_product = products.first.css(".product-list__product-name h3").first.text.strip()
        print(f"First product on page 2: {first_product}")

if __name__ == "__main__":
    asyncio.run(check_page_2())
