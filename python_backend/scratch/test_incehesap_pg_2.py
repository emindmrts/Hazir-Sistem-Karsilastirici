from scrapling import Fetcher

def test():
    f = Fetcher()
    base = 'https://www.incehesap.com/hazir-sistemler-fiyatlari/'
    patterns = [
        'sayfa-2/',
        '?page=2',
        '?p=2',
        '?pg=2'
    ]
    
    p1 = f.get(base)
    prod1 = p1.css('a.product').first.attrib.get('title') if p1.css('a.product') else "N/A"
    print(f"Page 1 first prod: {prod1}")

    for p in patterns:
        url = base + p
        res = f.get(url)
        prod = res.css('a.product').first.attrib.get('title') if res.css('a.product') else "N/A"
        print(f"URL: {url} -> First prod: {prod}")
        if prod != prod1 and prod != "N/A":
            print(f"MATCH! Pattern {p} works.")

if __name__ == "__main__":
    test()
