import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, '.')

async def test_all():
    results = {}
    scrapers = ['sinerji', 'gamegaraj', 'itopya', 'vatan', 'incehesap', 'pckolik', 'gaminggen', 'tebilon', 'enucuzsistem']

    for name in scrapers:
        try:
            mod = __import__(f'scrapers.{name}', fromlist=[name])
            if hasattr(mod, 'scrape_all_pages_async'):
                fn = mod.scrape_all_pages_async
                result = await asyncio.wait_for(fn(), timeout=40)
            else:
                result = mod.scrape_all_pages()
            results[name] = {'count': len(result), 'error': None}
        except Exception as e:
            results[name] = {'count': 0, 'error': str(e)[:300]}

    print("\n=== SCRAPER TEST SONUCLARI ===")
    for name, r in results.items():
        if r['error']:
            print(f"[HATA] {name}: {r['error']}")
        else:
            print(f"[OK]   {name}: {r['count']} urun")

asyncio.run(test_all())
