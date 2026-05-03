
from scrapling import Fetcher
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def test_sinerji():
    fetcher = Fetcher()
    base_url = "https://www.sinerji.gen.tr/oyun-icin-oem-paketler-c-2202"
    page = fetcher.get(base_url, stealthy_headers=True)
    if not page: return

    first_prod = page.css(".product").first
    if not first_prod: return

    print("--- ALL CHILDREN OF .product ---")
    # scrapling selectors don't have a direct 'children' method like BeautifulSoup, 
    # but we can use css("*") or xpath("./*")
    children = first_prod.css("*")
    for child in children:
        tag = child.tag_name if hasattr(child, 'tag_name') else "???"
        cls = child.attrib.get('class', '')
        txt = child.get_all_text().strip()
        if txt and len(txt) < 100:
            print(f"Tag: {tag} | Class: {cls} | Text: {txt}")

if __name__ == "__main__":
    test_sinerji()
