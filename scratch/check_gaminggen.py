import json

with open("gaminggen_test.json", encoding="utf-8") as f:
    data = json.load(f)

total    = len(data)
no_price = sum(1 for p in data if p["price"] == 0.0)
no_cpu   = sum(1 for p in data if p["specs"]["CPU"] == "N/A")
no_gpu   = sum(1 for p in data if p["specs"]["GPU"] == "N/A")
no_ram   = sum(1 for p in data if p["specs"]["RAM"] == "N/A")
no_stor  = sum(1 for p in data if p["specs"]["Storage"] == "N/A")

print(f"Toplam          : {total}")
print(f"Fiyatsiz (0)    : {no_price} ({no_price/total*100:.1f}%)")
print(f"CPU N/A         : {no_cpu} ({no_cpu/total*100:.1f}%)")
print(f"GPU N/A         : {no_gpu} ({no_gpu/total*100:.1f}%)")
print(f"RAM N/A         : {no_ram} ({no_ram/total*100:.1f}%)")
print(f"Storage N/A     : {no_stor} ({no_stor/total*100:.1f}%)")

priced = [p for p in data if p["price"] > 0]
print(f"\nFiyati olan urun: {len(priced)}")
for p in priced[:5]:
    print(f"  {p['name'][:45]:45s} -> {p['price']:>12,.2f} TL")

print("\nFiyatsiz ornekler:")
for p in [x for x in data if x["price"] == 0][:3]:
    print(f"  {p['name'][:45]}")

print("\n--- Ornek urun (index 0) ---")
print(json.dumps(data[0], ensure_ascii=False, indent=2))
