from scrapling import Fetcher
f = Fetcher()
print("P1:", len(f.get("https://www.itopya.com/oem-paketler").css(".product")))
print("P2_pg:", len(f.get("https://www.itopya.com/oem-paketler?pg=2").css(".product")))
print("P2_sayfa:", len(f.get("https://www.itopya.com/oem-paketler?sayfa=2").css(".product")))
print("P2_page:", len(f.get("https://www.itopya.com/oem-paketler?page=2").css(".product")))
