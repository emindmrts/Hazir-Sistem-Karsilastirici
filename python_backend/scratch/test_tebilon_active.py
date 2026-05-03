
import asyncio
from scrapling.fetchers import StealthyFetcher
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

async def test_tebilon_active():
    main_url = "https://www.tebilon.com/hazir-sistemler/"
    main_page = await StealthyFetcher.async_fetch(main_url, headless=True)
    if not main_page: return
        
    link_el = main_page.css(".showcase__title a").first
    url = link_el.attrib.get("href")
    if not url.startswith("http"): url = "https://www.tebilon.com" + url
        
    print(f"Fetching Tebilon detail page: {url}")
    detail_page = await StealthyFetcher.async_fetch(url, headless=True)
    if not detail_page: return
        
    checked = detail_page.css("input:checked")
    if checked:
        print(f"Found {len(checked)} checked inputs. Context:")
        for c in checked:
            # We can use xpath to get the parent li or div
            # E.g. c.xpath("..")
            try:
                # Let's try to get all text from the grandparent just in case
                gp = c.xpath("../..")
                if gp:
                    print("GRANDPARENT TEXT:", gp[0].get_all_text().strip())
            except Exception as e:
                print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_tebilon_active())
