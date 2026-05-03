from scrapling import Fetcher

def test():
    f = Fetcher()
    p1 = f.get('https://www.sinerji.gen.tr/oyun-icin-oem-paketler-c-2202')
    p2 = f.get('https://www.sinerji.gen.tr/oyun-icin-oem-paketler-c-2202?px=2')
    
    prods1 = [el.css('.title a').first.text.strip() for el in p1.css('.product') if el.css('.title a').first]
    prods2 = [el.css('.title a').first.text.strip() for el in p2.css('.product') if el.css('.title a').first]
    
    print(f"Page 1: {len(prods1)} products, first: {prods1[0] if prods1 else 'N/A'}")
    print(f"Page 2: {len(prods2)} products, first: {prods2[0] if prods2 else 'N/A'}")
    
    if prods1 == prods2:
        print("SAME PRODUCTS! Pagination failed.")
    else:
        print("DIFFERENT PRODUCTS! Pagination works.")

if __name__ == "__main__":
    test()
