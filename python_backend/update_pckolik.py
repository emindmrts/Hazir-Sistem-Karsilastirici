import json
from pathlib import Path
from scrapers.pckolik import scrape_all_pages

MOCK_JSON = Path("mock.json")

def main():
    print("PC Kolik verileri cekiliyor...")
    new_pckolik = scrape_all_pages()
    
    if MOCK_JSON.exists():
        try:
            products = json.loads(MOCK_JSON.read_text(encoding="utf-8"))
        except:
            products = []
    else:
        products = []
        
    # Eski pckolik urunlerini sil
    products = [p for p in products if p.get("store") != "pckolik"]
    
    # Yeni pckolik urunlerini ekle
    products.extend(new_pckolik)
    
    MOCK_JSON.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"mock.json güncellendi! {len(new_pckolik)} PC Kolik ürünü eklendi.")

if __name__ == "__main__":
    main()
