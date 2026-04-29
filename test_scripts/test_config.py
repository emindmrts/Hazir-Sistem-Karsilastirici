from scrapling.fetchers import StealthyFetcher
import asyncio

async def test():
    try:
        print("Testing StealthyFetcher.configure...")
        # Try as class method
        StealthyFetcher.configure(headless=True)
        print("Class method configure(headless=True) worked.")
    except Exception as e:
        print(f"Class method failed: {e}")

    try:
        fetcher = StealthyFetcher()
        fetcher.configure(headless=True)
        print("Instance method configure(headless=True) worked.")
    except Exception as e:
        print(f"Instance method failed: {e}")

if __name__ == "__main__":
    asyncio.run(test())
