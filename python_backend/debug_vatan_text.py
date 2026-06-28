import asyncio
from scrapling.fetchers import StealthyFetcher

async def debug_vatan_text():
    url = "https://www.vatanbilgisayar.com/oem-paketler/"
    print(f"Fetching {url}...")
    page = await StealthyFetcher.async_fetch(
        url,
        headless=True,
        wait_until="domcontentloaded",
        timeout=60000,
    )
    
    # Print all text from the page that looks like it could be pagination
    # Usually pagination is near the bottom
    all_text = page.text
    lines = all_text.split("\n")
    for i, line in enumerate(lines):
        if any(char.isdigit() for char in line) and len(line.strip()) < 50:
            # Check if this line is near other numbers
            print(f"L{i}: {line.strip()}")

if __name__ == "__main__":
    asyncio.run(debug_vatan_text())
