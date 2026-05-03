from scrapling import Fetcher

def test():
    f = Fetcher()
    p1 = f.get('https://www.incehesap.com/hazir-sistemler-fiyatlari/')
    p2 = f.get('https://www.incehesap.com/hazir-sistemler-fiyatlari/sayfa-2/')
    
    print(f"Page 1 count: {len(p1.css('a.product'))}")
    print(f"Page 2 (/sayfa-2/) count: {len(p2.css('a.product'))}")
    
    # Check first product on each page
    prod1 = p1.css('a.product').first.attrib.get('title') if p1.css('a.product') else "N/A"
    prod2 = p2.css('a.product').first.attrib.get('title') if p2.css('a.product') else "N/A"
    print(f"Page 1 first prod: {prod1}")
    print(f"Page 2 first prod: {prod2}")

if __name__ == "__main__":
    test()
