"""Run all individual scrapers without prompt, save results."""
import sys, os, json, time, asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scrapers.vatan        import scrape_all_pages_async as scrape_vatan
from scrapers.sinerji      import scrape_all_pages_async as scrape_sinerji
from scrapers.gamegaraj    import scrape_all_pages_async as scrape_gamegaraj
from scrapers.itopya       import scrape_all_pages_async as scrape_itopya
from scrapers.incehesap    import scrape_all_pages_async as scrape_incehesap
from scrapers.pckolik      import scrape_all_pages_async as scrape_pckolik
from scrapers.gaminggen    import scrape_all_pages_async as scrape_gaminggen
from scrapers.tebilon      import scrape_all_pages_async as scrape_tebilon

ROOT = Path(__file__).parent.parent
MOCK = ROOT / "mock.json"
CACHE = ROOT / "cache-meta.json"

SCRAPERS = [
    ("Vatan",     scrape_vatan),
    ("InceHesap", scrape_incehesap),
    ("PCKolik",   scrape_pckolik),
    ("GamingGen", scrape_gaminggen),
    ("Tebilon",   scrape_tebilon),
    ("Itopya",    scrape_itopya),
    ("Sinerji",   scrape_sinerji),
    ("GameGaraj", scrape_gamegaraj),
]

def save(products):
    MOCK.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    CACHE.write_text(json.dumps({"lastUpdated": int(time.time()*1000), "totalProducts": len(products)}, ensure_ascii=False), encoding="utf-8")
    for d in [ROOT/"client/public", ROOT/"client/dist"]:
        if d.exists():
            (d/"mock.json").write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
            (d/"cache-meta.json").write_text(json.dumps({"lastUpdated": int(time.time()*1000), "totalProducts": len(products)}, ensure_ascii=False), encoding="utf-8")

async def main():
    all_products = []
    for name, scraper in SCRAPERS:
        print(f"\n--- {name} ---")
        try:
            result = await scraper()
            print(f"  {name}: {len(result)} products")
            all_products.extend(result)
        except Exception as e:
            print(f"  {name} ERROR: {e}")
    
    # N/A analysis
    total = len(all_products)
    na_counts = {}
    for p in all_products:
        specs = p.get("specs", {})
        for k, v in specs.items():
            if v == "N/A":
                na_counts[k] = na_counts.get(k, 0) + 1
    
    print(f"\n{'='*50}")
    print(f"Total products: {total}")
    print(f"\nN/A breakdown:")
    for k in ["CPU","Motherboard","GPU","RAM","Storage","Case","PSU","Cooler"]:
        c = na_counts.get(k, 0)
        pct = (c/total*100) if total else 0
        bar = "█" * int(c / max(total, 1) * 40)
        print(f"  {k:12s} 🌑 {c:5d}/{total} ({pct:5.1f}%) {bar}")
    
    # Per-store N/A
    print(f"\nPer-store N/A breakdown:")
    stores = {}
    for p in all_products:
        store = p.get("store", "unknown")
        if store not in stores:
            stores[store] = {"total": 0, "na": {k:0 for k in ["CPU","Motherboard","GPU","RAM","Storage","Case","PSU","Cooler"]}}
        stores[store]["total"] += 1
        specs = p.get("specs", {})
        for k in ["CPU","Motherboard","GPU","RAM","Storage","Case","PSU","Cooler"]:
            if specs.get(k) == "N/A":
                stores[store]["na"][k] += 1
    
    for store, data in sorted(stores.items()):
        t = data["total"]
        na_fields = [k for k, v in data["na"].items() if v > 0]
        if na_fields:
            details = ", ".join(f"{k}={v}/{t}" for k,v in data["na"].items() if v > 0)
            print(f"  {store:12s} ({t:4d} urun): {details}")
    
    save(all_products)
    print(f"\nSaved to {MOCK}")

asyncio.run(main())
