
from scrapling import Fetcher
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def test_gamegaraj_active():
    f = Fetcher()
    # Find a product link from main page first
    url = "https://www.gamegaraj.com/oem-paketler/perfedge-5a/"
    print("Fetching GameGaraj detail:", url)
    detail_page = f.get(url, stealthy_headers=True)
    if not detail_page:
        print("Failed to fetch detail page")
        return
        
    print("--- Searching for specific classes ---")
    
    # Try finding selected items. Sometimes it's a div with a selected class, or text inside an active element.
    # GameGaraj has "pc-builder" classes.
    
    # Let's just print all text inside td, li, or div that contains "kasa", "psu" etc.
    texts = detail_page.get_all_text().split('\n')
    for t in texts:
        t = t.strip()
        if len(t) > 5 and len(t) < 150:
            if "kasa" in t.lower() or "sistemi" in t.lower() or "anakart" in t.lower() or "rtx" in t.lower():
                print("TEXT FOUND:", t)

    # What if it's rendered by JS?
    print("Is there vue or react?", "vue" in detail_page.get_all_text().lower(), "react" in detail_page.get_all_text().lower())

if __name__ == "__main__":
    test_gamegaraj_active()
