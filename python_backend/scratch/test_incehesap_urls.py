import sys
import asyncio
sys.path.append('C:/Users/samsu/Desktop/HAZIR SİSTEM/Hazir-Sistem-Karsilastirici/python_backend')
from scrapling.fetchers import StealthyFetcher

async def test():
    f = StealthyFetcher()
    
    # Try all the page number variations
    urls_to_test = [
        # Various page number formats
        'https://www.incehesap.com/hazir-sistemler-fiyatlari/',
        'https://www.incehesap.com/hazir-sistemler-fiyatlari/?page=1',
        'https://www.incehesap.com/hazir-sistemler-fiyatlari/?page=2',
        'https://www.incehesap.com/hazir-sistemler-fiyatlari/sayfa-1/',
        'https://www.incehesap.com/hazir-sistemler-fiyatlari/sayfa-2/',
        'https://www.incehesap.com/hazir-sistemler-fiyatlari/sayfa-1',
        'https://www.incehesap.com/hazir-sistemler-fiyatlari/sayfa-2',
    ]
    
    results = {}
    
    for url in urls_to_test:
        page = await f.async_fetch(url, wait_until='domcontentloaded')
        cards = page.css('a.product')
        products = []
        for card in cards:
            name = card.attrib.get('title', '')
            if name:
                products.append(name)
        results[url] = products
        print(f'{url}')
        print(f'  -> {len(products)} products')
    
    # Find unique products for each URL
    all_products = set()
    for products in results.values():
        all_products.update(products)
    
    print(f'\nTotal unique products: {len(all_products)}')
    print(f'Total page fetches: {len(urls_to_test)}')

asyncio.run(test())