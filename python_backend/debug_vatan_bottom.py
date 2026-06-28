import asyncio
from scrapling.fetchers import StealthyFetcher

async def debug_vatan_bottom():
    url = "https://www.vatanbilgisayar.com/oem-paketler/"
    print(f"Fetching {url}...")
    page = await StealthyFetcher.async_fetch(
        url,
        headless=True,
        wait_until="domcontentloaded",
        timeout=60000,
    )
    
    # Dump everything that looks like a footer or pagination
    # Search for all divs with 'pagination' or 'paging' or 'wrapper' in class
    elements = page.xpath("//div[contains(@class, 'pagination') or contains(@class, 'paging') or contains(@class, 'footer')]")
    for el in elements:
        print(f"Class: {el.attrib.get('class')}")
        print(f"Text: {el.text.strip()[:100]}")
        print("-" * 20)

    # Also search for 'ürün bulundu' text
    import re
    text = page.text
    match = re.search(r"(\d+)\s*ürün\s*bulundu", text, re.IGNORECASE)
    if match:
        print(f"Found product count: {match.group(1)}")
    else:
        print("Could not find 'ürün bulundu' text")

if __name__ == "__main__":
    asyncio.run(debug_vatan_bottom())
