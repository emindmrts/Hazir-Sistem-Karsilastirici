from scrapling import Fetcher

def test():
    f = Fetcher()
    base = 'https://www.incehesap.com/hazir-sistemler-fiyatlari/'
    p1 = f.get(base, stealthy_headers=True)
    p2 = f.get(base + '?p=2', stealthy_headers=True)
    
    prods1 = [a.attrib.get('title') for a in p1.css('a.product')]
    prods2 = [a.attrib.get('title') for a in p2.css('a.product')]
    
    print(f"Page 1 (first 3): {prods1[:3]}")
    print(f"Page 2 (first 3): {prods2[:3]}")
    
    common = set(prods1).intersection(set(prods2))
    print(f"Common products: {len(common)}")

if __name__ == "__main__":
    test()
