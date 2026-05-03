from scrapling import Fetcher
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

fetcher = Fetcher()
url = "https://www.vatanbilgisayar.com/oem-paketler/"
print(f"Fetching {url}...")
page = fetcher.get(url, stealthy_headers=True)
# scrapling Response attributes: status, text, body, etc.
print(f"Status: {page.status}")
print(f"Length: {len(page.text)}")

# Look for product-list--grid
if "product-list--grid" in page.text:
    print("FOUND 'product-list--grid'")
else:
    print("NOT FOUND 'product-list--grid'")

if "product-list-link" in page.text:
    print("FOUND 'product-list-link'")

# Print some snippets to see what's there
print("\nHTML Snippet:")
print(page.text[20000:25000])
