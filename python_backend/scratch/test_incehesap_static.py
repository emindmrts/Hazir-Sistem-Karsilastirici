
from scrapling import Fetcher
import sys
import re
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def test_incehesap_raw_data():
    fetcher = Fetcher()
    url = "https://www.incehesap.com/ferzex-gold-oem-paket-fiyati-50710/"
    detail_page = fetcher.get(url, stealthy_headers=True)
    if not detail_page: return
    
    html = detail_page.body.decode('utf-8', errors='ignore')
    
    # Try finding an array of products
    # E.g. [{"id": ..., "name": "MSI PRO H610M-E" ... }]
    
    # Find all occurrences of "anakart" or "kasa" and print the 200 chars before and after
    matches = [m.start() for m in re.finditer(r'anakart', html, re.IGNORECASE)]
    for m in matches:
        snippet = html[max(0, m-200):min(len(html), m+200)]
        if "category" in snippet or "name" in snippet:
            print("MATCH:", snippet.replace('\n', ' '))
            print("-" * 50)

if __name__ == "__main__":
    test_incehesap_raw_data()
