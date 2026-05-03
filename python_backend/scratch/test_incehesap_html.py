import sys
import asyncio
sys.path.append('C:/Users/samsu/Desktop/HAZIR SİSTEM/Hazir-Sistem-Karsilastirici/python_backend')
from scrapling.fetchers import StealthyFetcher

async def test():
    f = StealthyFetcher()
    
    # Fetch page 1 and page 2 and see their HTML content
    p1 = await f.async_fetch('https://www.incehesap.com/hazir-sistemler-fiyatlari/', wait_until='domcontentloaded')
    p2 = await f.async_fetch('https://www.incehesap.com/hazir-sistemler-fiyatlari/sayfa-2/', wait_until='domcontentloaded')
    
    # Check the raw HTML for page number indicators
    html1 = p1.text
    html2 = p2.text
    
    # Look for page number elements in the HTML
    print('Page 1 - looking for pagination info:')
    search_terms = ['sayfa', 'page', 'toplam', 'liste']
    for term in search_terms:
        count1 = html1.lower().count(term)
        count2 = html2.lower().count(term)
        print(f'  "{term}": page1={count1}, page2={count2}')

asyncio.run(test())