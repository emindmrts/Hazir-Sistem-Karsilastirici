
from scrapling import Fetcher
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def test_vatan_detail():
    fetcher = Fetcher()
    url = "https://www.vatanbilgisayar.com/intel-i5-12400f-rtx-5060-h610m-480gb-m-2-ssd-16g-145719.html"
    print(f"Fetching {url}...")
    page = fetcher.get(url, stealthy_headers=True)
    if not page:
        print("Failed to fetch.")
        return

    print("Page fetched. Looking for selected components...")
    
    # In Vatan configurator, selected items usually have specific classes like "active" or radio buttons checked.
    # Let's dump all text to see if we can find keywords
    
    text = page.get_all_text()
    
    print("--- Searching for Case (Kasa) ---")
    for line in text.split('\n'):
        if 'kasa' in line.lower() or 'power' in line.lower() or 'psu' in line.lower():
            if len(line.strip()) > 0 and len(line.strip()) < 150:
                print(line.strip())
                
    # Let's try CSS selectors. Often it's label.active or similar
    labels = page.css("label.labl")
    for lbl in labels:
        p_tags = lbl.css("p")
        texts = [p.text.strip() for p in p_tags if p.text]
        if "SEÇİLDİ" in texts:
            print(f"SELECTED COMPONENT: {texts[0]}")

if __name__ == "__main__":
    test_vatan_detail()
