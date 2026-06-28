import asyncio
from scrapling.fetchers import StealthyFetcher

async def dump_vatan():
    url = "https://www.vatanbilgisayar.com/oem-paketler/"
    print(f"Fetching {url}...")
    page = await StealthyFetcher.async_fetch(
        url,
        headless=True,
        wait_until="networkidle",
        timeout=60000,
    )
    with open("vatan_dump.html", "w", encoding="utf-8") as f:
        f.write(page.html)
    print("Dumped to vatan_dump.html")

if __name__ == "__main__":
    asyncio.run(dump_vatan())
