import asyncio
from scrapling.fetchers import StealthyFetcher

async def debug_vatan():
    url = "https://www.vatanbilgisayar.com/oem-paketler/"
    print(f"Fetching {url}...")
    page = await StealthyFetcher.async_fetch(
        url,
        headless=True,
        wait_until="domcontentloaded",
        timeout=60000,
    )
    
    print("--- Searching for links ---")
    links = page.css("a")
    for link in links:
        href = link.attrib.get("href", "")
        text = link.text.strip()
        if "page=" in href or text.isdigit():
            print(f"Link: {text} -> {href} (Class: {link.attrib.get('class')})")

    print("--- Searching for wrapper ---")
    # Search for anything with 'wrapper' in class
    wrappers = page.xpath("//div[contains(@class, 'wrapper')]")
    for w in wrappers:
        cls = w.attrib.get("class")
        if "pagination" in cls.lower():
            print(f"Found wrapper: {cls}")

if __name__ == "__main__":
    asyncio.run(debug_vatan())
