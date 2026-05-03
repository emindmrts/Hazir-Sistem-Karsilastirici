from scrapling import Fetcher

def test():
    f = Fetcher()
    p1 = f.get('https://www.incehesap.com/hazir-sistemler-fiyatlari/', stealthy_headers=True)
    p2 = f.get('https://www.incehesap.com/hazir-sistemler-fiyatlari/sayfa-2/', stealthy_headers=True)
    
    prods1 = [a.attrib.get('title') for a in p1.css('a.product')]
    prods2 = [a.attrib.get('title') for a in p2.css('a.product')]
    
    print(f"Page 1: {prods1[:5]}")
    print(f"Page 2: {prods2[:5]}")
    
    common = set(prods1).intersection(set(prods2))
    print(f"Common products: {len(common)}")

if __name__ == "__main__":
    test()
