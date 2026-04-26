import asyncio
from main import run_all_scrapers

async def main():
    print("Scraping islemi baslatiliyor...")
    products = await run_all_scrapers()
    print(f"Scraping tamamlandı. Toplam bulunan ürün sayısı: {len(products)}")

if __name__ == "__main__":
    asyncio.run(main())
