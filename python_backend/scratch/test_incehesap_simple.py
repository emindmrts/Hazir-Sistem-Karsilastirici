import sys
import asyncio
sys.path.append('C:/Users/samsu/Desktop/HAZIR SİSTEM/Hazir-Sistem-Karsilastirici/python_backend')
from scrapling.fetchers import StealthyFetcher

async def test():
    f = StealthyFetcher()
    
    # Simple test - 2 pages
    p1 = await f.async_fetch('https://www.incehesap.com/hazir-sistemler-fiyatlari/', wait_until='domcontentloaded')
    p2 = await f.async_fetch('https://www.incehesap.com/hazir-sistemler-fiyatlari/sayfa-2/', wait_until='domcontentloaded')
    
    def get_names(page):
        return [el.attrib.get('title', '') for el in page.css('a.product') if el.attrib.get('title', '')]
    
    n1 = get_names(p1)
    n2 = get_names(p2)
    
    print('Page 1:', len(n1), 'products')
    print('Page 2:', len(n2), 'products')
    print('Common:', len(set(n1).intersection(set(n2))))
    print('Unique to page 1:', len(set(n1) - set(n2)))
    print('Unique to page 2:', len(set(n2) - set(n1)))

asyncio.run(test())