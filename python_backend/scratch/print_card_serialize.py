import sys
from scrapling import Fetcher

sys.stdout.reconfigure(encoding="utf-8")

fetcher = Fetcher()
page = fetcher.get("https://pckolik.com.tr/kategori/oem-paketler")
if not page:
    sys.exit(1)

cards = page.css(".product-card")
if cards:
    try:
        # Let's try serialize()
        print(cards[0].serialize())
    except Exception as e:
        print("serialize failed:", e)
        # If serialize failed, let's print lxml representation or something
        try:
            from lxml import etree
            # cards[0]._root is the lxml element
            print(etree.tostring(cards[0]._root, encoding="utf-8", pretty_print=True).decode("utf-8"))
        except Exception as e2:
            print("lxml tostring failed:", e2)
