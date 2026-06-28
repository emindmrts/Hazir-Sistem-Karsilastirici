import sys
from scrapling import Fetcher

sys.stdout.reconfigure(encoding="utf-8")

fetcher = Fetcher()
page = fetcher.get("https://pckolik.com.tr/kategori/oem-paketler")
if not page:
    sys.exit(1)

cards = page.css(".product-card")
if cards:
    # Print the raw HTML of the first card
    import html
    # In scrapling, elements don't have a direct raw HTML dump method sometimes, or we can use lxml/soup representation.
    # Let's inspect what attributes and methods the card object has.
    print(dir(cards[0]))
    # Typically, an element in scrapling is a Selector or Adaptor wrapper.
    # We can get HTML by checking if there's a serialize/tostring or similar, or just print its text or child elements.
    # Wait, scrapling's selector has `.xpath()` or `.css()` and we can print the outer HTML if we use xpath(".").
    # Let's see if we can do cards[0].text or similar. Let's dump all tags.
    for tag in cards[0].xpath(".//*"):
        print(f"Tag: {tag.attrib.get('class', '') or tag.xpath('name(.)')} -> {tag.get_all_text().strip()}")
