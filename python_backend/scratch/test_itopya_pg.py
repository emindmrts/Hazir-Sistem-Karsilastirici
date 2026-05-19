from scrapling.fetchers import StealthyFetcher
import asyncio

async def test():
    f = StealthyFetcher()
    p1 = await f.async_fetch('https://www.itopya.com/oem-paketler')
    p2 = await f.async_fetch('https://www.itopya.com/oem-paketler?page=2')
    
    def get_names(page):
        cards = page.css(".product") or page.css(".product-card")
        return [el.css("a[href*='/oem-paketler/']").first.text.strip() for el in cards if el.css("a[href*='/oem-paketler/']").first]

    names1 = get_names(p1)
    names2 = get_names(p2)
    
    print(f"Page 1 (first 5): {names1[:5]}")
    print(f"Page 2 (first 5): {names2[:5]}")
    
    common = set(names1).intersection(set(names2))
    print(f"Common: {len(common)} / {len(names1)}")

if __name__ == "__main__":
    asyncio.run(test())
