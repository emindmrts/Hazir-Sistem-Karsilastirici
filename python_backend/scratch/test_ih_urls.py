
from scrapling import Fetcher
import json
f = Fetcher()
for pg in [1, 2, 3]:
    url = "https://www.incehesap.com/hazir-sistemler-fiyatlari/" if pg == 1 else f"https://www.incehesap.com/hazir-sistemler-fiyatlari/sayfa-{pg}/"
    page = f.get(url, stealthy_headers=True)
    cards = page.css("a.product")
    oem = [c for c in cards if "-oem-paket-fiyati-" in c.attrib.get("href", "")]
    other = [c for c in cards if "-oem-paket-fiyati-" not in c.attrib.get("href", "") and c.attrib.get("href","")]
    print(f"Page {pg}: total={len(cards)}, OEM={len(oem)}, other={len(other)}")
    for c in oem[:3]:
        href = c.attrib.get("href", "")
        data = c.attrib.get("data-product", "")
        name = json.loads(data).get("name", "") if data else c.attrib.get("title", "")
        print(f"  OEM: {href[:55]} name={name[:35]}")
    for c in other[:2]:
        href = c.attrib.get("href", "")
        data = c.attrib.get("data-product", "")
        name = json.loads(data).get("name", "") if data else c.attrib.get("title", "")
        cat = json.loads(data).get("category", "") if data else ""
        print(f"  OTHER: {href[:55]} name={name[:35]} cat={cat}")
