import asyncio
from scrapling.fetchers import StealthyFetcher

async def test():
    print("Testing class method call directly...")
    try:
        url = "https://www.google.com"
        page = await StealthyFetcher.async_fetch(url, headless=True)
        print("Fetch success")
        pass
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
