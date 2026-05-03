
from scrapling import Fetcher
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def test_tebilon_static():
    fetcher = Fetcher()
    url = "https://www.tebilon.com/amd-ryzen-7800x3d-msi-geforce-rtx-5080-16gb-mag-x870e-tomahawk-wifi-msi-1tb-32gb-ddr5/"
    print("Fetching statically:", url)
    page = fetcher.get(url, stealthy_headers=True)
    if not page:
        print("Failed to fetch.")
        return
        
    checked = page.css("input:checked")
    if checked:
        print(f"Found {len(checked)} checked inputs.")
        for c in checked:
            gp = c.xpath("../..")
            if gp:
                print("GRANDPARENT TEXT:", gp[0].get_all_text().strip())

if __name__ == "__main__":
    test_tebilon_static()
