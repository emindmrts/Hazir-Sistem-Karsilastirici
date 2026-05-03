
from scrapling import Fetcher
import sys

def test():
    f = Fetcher()
    page = f.get("https://www.vatanbilgisayar.com/oem-paketler/")
    link = page.css("a.product-list-link").first
    if not link:
        print("No link found")
        return
    href = link.attrib.get("href", "")
    url = href if href.startswith("http") else f"https://www.vatanbilgisayar.com{href}"
    print("Fetching:", url)
    detail = f.get(url)
    if not detail:
        print("Failed to fetch detail")
        return
    
    # Try to find selected items
    labels = detail.css("label.labl")
    for lbl in labels:
        p_tags = lbl.css("p")
        texts = [p.text.strip() for p in p_tags if p.text]
        if "SEÇİLDİ" in texts:
            print(f"SELECTED COMPONENT: {texts[0]}")

if __name__ == "__main__":
    test()
