
from scrapling import Fetcher
import re
f = Fetcher()
page = f.get('https://www.incehesap.com/hazir-sistemler-fiyatlari/', stealthy_headers=True)
html = page.body.decode('utf-8', errors='ignore')

cards = page.css("a.product")
print("Total a.product on page 1:", len(cards))

# look for API or data endpoints
for pattern in [r'"(/api/[^"]{5,80})"', r"'(/api/[^']{5,80})'", r'axios\.get\(["\'](.*?)["\']\)', r'url:\s*["\'](.*?)["\']']:
    ms = re.findall(pattern, html)
    if ms:
        print("FOUND:", ms[:5])

# Look for total product count
m = re.search(r'(\d+)\s+adet', html)
if m:
    print("Count:", m.group())
