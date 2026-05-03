import sys
sys.path.append('C:/Users/samsu/Desktop/HAZIR SİSTEM/Hazir-Sistem-Karsilastirici/python_backend')
from scrapling import Fetcher

f = Fetcher()
page = f.get('https://www.incehesap.com/hazir-sistemler-fiyatlari/')

# Try various selectors to find pagination
selectors = ['a.sayfa', '.sayfa', '.pagination', 'ul.pagination', '.paging']
for sel in selectors:
    links = page.css(sel)
    if links:
        print(f'Selector "{sel}": {len(links)} links found')
        for link in links[:5]:
            href = link.attrib.get('href', '')
            text = link.text.strip()
            print(f'  - {href} | "{text}"')

# Also check for any links containing sayfa or page
all_links = page.css('a')
sayfa_links = [l for l in all_links if 'sayfa' in l.attrib.get('href', '').lower()]
print(f'\nTotal links with "sayfa": {len(sayfa_links)}')
for link in sayfa_links[:10]:
    print(f'  - {link.attrib.get("href", "")}')