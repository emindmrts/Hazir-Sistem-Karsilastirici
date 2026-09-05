"""
EnUcuzSistem scraper
Kaynak: https://enucuzsistem.com/api/products?page=N&category=hazir-sistem
Toplam ~2880 urun, 120 sayfa, pageSize=24

Her urun kendi sitesinin linkiyle (link alanı) degil, satici sitesiyle kaydedilir.
Magaza adı 'store' alanından normalize edilir.
"""

import asyncio
import re
import sys
import httpx
from .utils import extract_specs_from_name, merge_specs

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "https://enucuzsistem.com/api/products"
PAGE_SIZE = 48   # API max 48'e kadar destekliyor

STORE_MAP = {
    "vatan":                "vatan",
    "gaming-gen":           "gaminggen",
    "gaminggen":            "gaminggen",
    "gaminggentr":          "gaminggen",
    "sinerji":              "sinerji",
    "gamegaraj":            "gamegaraj",
    "pckolik":              "pckolik",
    "itopya":               "itopya",
    "monster":              "monster",
    "tebilon":              "tebilon",
    "incehesap":            "incehesap",
}

def normalize_store(raw: str) -> str:
    """'gaming-gen-hb' → 'gaminggen', 'tebilon-hb' → 'tebilon' vb."""
    base = raw.lower().split("-hb")[0].split("-trendyol")[0].split("-n11")[0] \
               .split("-amazon")[0].split("-pazarama")[0]
    for key, val in STORE_MAP.items():
        if base == key:
            return val
    return base


def _s(*vals) -> str:
    """Ilk dolu deger (API null'lari atla)."""
    for v in vals:
        if v is not None and str(v).strip() != "":
            return str(v).strip()
    return ""


def _has_unit(s: str, *keywords) -> bool:
    n = s.lower()
    return any(k in n for k in keywords)


def map_product(raw: dict) -> dict:
    specs_raw = raw.get("specs") or {}

    # CPU / GPU: ham metin, yoksa Brand + kanonik modelden derle
    cpu = _s(specs_raw.get("CPU"))
    if not cpu:
        brand, canon = _s(specs_raw.get("CPU_Brand")), _s(raw.get("cpuCanonical"))
        cpu = " ".join(x for x in [brand, canon] if x)
    gpu = _s(specs_raw.get("GPU"))
    if not gpu:
        brand, canon = _s(specs_raw.get("GPU_Brand")), _s(raw.get("gpuCanonical"))
        gpu = " ".join(x for x in [brand, canon] if x)

    # RAM: Ram/RAM, yoksa Size (+Type) — birimsiz sayilari alma
    ram = _s(specs_raw.get("Ram"), specs_raw.get("RAM"))
    if not ram:
        size = _s(specs_raw.get("RAM_Size"))
        if _has_unit(size, "gb", "tb"):
            rtype = _s(specs_raw.get("RAM_Type"))
            ram = " ".join(x for x in [size, rtype] if x)

    # Storage: ayni kural
    storage = _s(specs_raw.get("Storage"))
    if not storage:
        size = _s(specs_raw.get("Storage_Size"))
        stype = _s(specs_raw.get("ssdType"))
        if _has_unit(size, "gb", "tb"):
            storage = size + (
                f" {stype}" if stype and _has_unit(stype, "gb", "tb", "ssd", "hdd", "nvme", "m.2") else ""
            )

    mobo = _s(specs_raw.get("Motherboard"), specs_raw.get("chipset"))

    # PSU: yoksa guc + verimlilikten derle ("750W 80+ Bronze")
    psu = _s(specs_raw.get("PSU"))
    if not psu:
        power = _s(specs_raw.get("PSU_Power"))
        eff = _s(specs_raw.get("psuEfficiency"))
        if re.match(r"^\d{3,4}$", power):
            psu = f"{power}W" + (f" {eff}" if eff else "")

    case_ = _s(specs_raw.get("Case"))
    cooler = _s(specs_raw.get("Cooler"))

    # Görüntü URL'si — '/api/cached-images?url=...' ise decode et
    image = raw.get("image") or ""
    if image.startswith("/api/cached-images"):
        try:
            from urllib.parse import parse_qs, urlparse, unquote
            qs = parse_qs(urlparse(image).query)
            image = unquote(qs.get("url", [""])[0])
        except Exception:
            pass
    if image and not image.startswith("http"):
        image = "https://enucuzsistem.com" + image

    name = (raw.get("name") or "").strip()

    specs = {
        "CPU":         cpu        or "N/A",
        "GPU":         gpu        or "N/A",
        "RAM":         ram        or "N/A",
        "Storage":     storage    or "N/A",
        "Motherboard": mobo       or "N/A",
        "PSU":         psu        or "N/A",
        "Case":        case_      or "N/A",
        "Cooler":      cooler     or "N/A",
    }
    # API'de eksik kalan alanlari once urun isminden, sonra link slug'indan
    # doldur (diger scraper'larla ayni). Slug'da CPU/GPU/RAM izleri olur.
    merge_specs(specs, extract_specs_from_name(name))
    merge_specs(specs, extract_specs_from_name(raw.get("link") or ""))

    return {
        "name":  name,
        "price": float(raw.get("price") or 0),
        "image": image,
        "url":   raw.get("link") or "",
        "store": normalize_store(raw.get("store") or ""),
        "specs": specs,
    }


async def scrape_all_pages_async() -> list[dict]:
    products: list[dict] = []
    page = 1

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://enucuzsistem.com/hazir-sistemler",
    }

    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        # İlk sayfayı al ve toplam sayfa sayısını öğren
        resp = await client.get(BASE_URL, params={"page": 1, "category": "hazir-sistem", "pageSize": PAGE_SIZE})
        resp.raise_for_status()
        data = resp.json()

        total_pages = data.get("totalPages", 1)
        items = data.get("products", [])
        products.extend(map_product(p) for p in items)
        print(f"[EnUcuzSistem] Sayfa 1/{total_pages} — {len(items)} urun", flush=True)

        # Geri kalan sayfaları paralel çek (5'li gruplar)
        for batch_start in range(2, total_pages + 1, 5):
            batch = range(batch_start, min(batch_start + 5, total_pages + 1))
            tasks = [
                client.get(BASE_URL, params={"page": pg, "category": "hazir-sistem", "pageSize": PAGE_SIZE})
                for pg in batch
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            for pg, res in zip(batch, responses):
                if isinstance(res, Exception):
                    print(f"[EnUcuzSistem] Sayfa {pg} HATA: {res}", flush=True)
                    continue
                try:
                    d = res.json()
                    batch_items = d.get("products", [])
                    products.extend(map_product(p) for p in batch_items)
                    print(f"[EnUcuzSistem] Sayfa {pg}/{total_pages} — {len(batch_items)} urun", flush=True)
                except Exception as e:
                    print(f"[EnUcuzSistem] Sayfa {pg} parse HATA: {e}", flush=True)

            await asyncio.sleep(0.3)   # rate-limit koruması

    # URL bazlı deduplikasyon
    seen: set[str] = set()
    unique: list[dict] = []
    for p in products:
        key = p["url"]
        if key and key not in seen:
            seen.add(key)
            unique.append(p)

    print(f"[EnUcuzSistem] TAMAMLANDI — {len(unique)} benzersiz urun", flush=True)
    return unique


def scrape_all_pages() -> list[dict]:
    return asyncio.run(scrape_all_pages_async())


if __name__ == "__main__":
    results = scrape_all_pages()
    print(f"Toplam: {len(results)}")
    if results:
        import json
        print(json.dumps(results[0], ensure_ascii=False, indent=2))
