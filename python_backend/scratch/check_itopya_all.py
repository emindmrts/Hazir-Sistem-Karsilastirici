from scrapling import Fetcher
f = Fetcher()
print("Total products with ?pg=100:", len(f.get("https://www.itopya.com/oem-paketler?pg=100").css(".product")))
