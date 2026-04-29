from sinerji import scrape_all_pages as scrape_sinerji
from gamegaraj import scrape_all_pages as scrape_gamegaraj

print("=== SINERJI ===")
p = scrape_sinerji()
print(f"Sinerji: {len(p)} urun")
if p:
    print(f"  Ilk urun: {p[0]['name']} - {p[0]['price']} TL")

print("\n=== GAMEGARAJ ===")
p2 = scrape_gamegaraj()
print(f"GameGaraj: {len(p2)} urun")
if p2:
    print(f"  Ilk urun: {p2[0]['name']} - {p2[0]['price']} TL")
