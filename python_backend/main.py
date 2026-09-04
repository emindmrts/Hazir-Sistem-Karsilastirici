"""
FastAPI backend - Hazir Sistem Karsilastirici
Endpoints:
  POST /api/getProducts   - mock.json'dan urunleri doner
  POST /api/scrape        - tum siteleri ceker, mock.json'i gunceller
  GET  /api/health        - sunucu saglik kontrolu
"""

import asyncio
import json
import sys
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Windows konsol encoding fix
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Scraper moduller
from scrapers.sinerji import scrape_all_pages as scrape_sinerji
from scrapers.gamegaraj import scrape_all_pages as scrape_gamegaraj
from scrapers.itopya import scrape_all_pages_async as scrape_itopya_async
from scrapers.vatan import scrape_all_pages_async as scrape_vatan_async
from scrapers.incehesap import scrape_all_pages_async as scrape_incehesap_async
from scrapers.pckolik import scrape_all_pages_async as scrape_pckolik_async
from scrapers.gaminggen import scrape_all_pages_async as scrape_gaminggen_async
from scrapers.tebilon import scrape_all_pages_async as scrape_tebilon_async
from scrapers.enucuzsistem import scrape_all_pages_async as scrape_enucuzsistem_async

# mock.json yolu - proje kokunde
MOCK_JSON = Path(__file__).parent.parent / "mock.json"
CACHE_META = Path(__file__).parent.parent / "cache-meta.json"

# load .env file manually if it exists
def load_env_file():
    for p in [Path(__file__).parent.parent / ".env", Path(__file__).parent / ".env"]:
        if p.exists():
            try:
                for line in p.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        parts = line.split("=", 1)
                        os.environ[parts[0].strip()] = parts[1].strip()
            except Exception as e:
                print(f"[WARN] Failed to load .env: {e}", flush=True)

load_env_file()
USE_ENUCUZSISTEM_API = os.environ.get("USE_ENUCUZSISTEM_API", "true").lower() in ("true", "1", "yes")

_scrape_lock = asyncio.Lock()
_scrape_in_progress = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Backend] Python FastAPI baslatildi - port 8000", flush=True)
    yield
    print("[Backend] Kapatiliyor...", flush=True)


app = FastAPI(title="Hazir Sistem Karsilastirici API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_mock() -> list[dict]:
    if MOCK_JSON.exists():
        try:
            return json.loads(MOCK_JSON.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def save_mock(products: list[dict]) -> None:
    unique_products = []
    seen = set()
    for p in products:
        if "store" in p and isinstance(p["store"], str):
            p["store"] = p["store"].lower()
        url_key = (p.get("url") or p.get("siteUrl") or f"{p.get('store')}-{p.get('name')}").strip().lower()
        if url_key not in seen:
            seen.add(url_key)
            unique_products.append(p)
    products = unique_products
    MOCK_JSON.write_text(
        json.dumps(products, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    CACHE_META.write_text(
        json.dumps({"lastUpdated": int(time.time() * 1000), "totalProducts": len(products)}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"[mock.json] Guncellendi - {len(products)} urun", flush=True)

    # Sync to client/public
    client_public_dir = Path(__file__).parent.parent / "client" / "public"
    if client_public_dir.exists():
        try:
            (client_public_dir / "mock.json").write_text(
                json.dumps(products, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            (client_public_dir / "cache-meta.json").write_text(
                json.dumps({"lastUpdated": int(time.time() * 1000), "totalProducts": len(products)}, ensure_ascii=False),
                encoding="utf-8",
            )
            print("[mock.json] client/public synced", flush=True)
        except Exception as e:
            print(f"[WARN] Failed to write to client/public: {e}", flush=True)

    # Sync to client/dist
    client_dist_dir = Path(__file__).parent.parent / "client" / "dist"
    if client_dist_dir.exists():
        try:
            (client_dist_dir / "mock.json").write_text(
                json.dumps(products, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            (client_dist_dir / "cache-meta.json").write_text(
                json.dumps({"lastUpdated": int(time.time() * 1000), "totalProducts": len(products)}, ensure_ascii=False),
                encoding="utf-8",
            )
            print("[mock.json] client/dist synced", flush=True)
        except Exception as e:
            print(f"[WARN] Failed to write to client/dist: {e}", flush=True)


async def run_all_scrapers() -> list[dict]:
    """Tum scraper'lari paralel calistir."""
    global _scrape_in_progress
    _scrape_in_progress = True

    try:
        if USE_ENUCUZSISTEM_API:
            print("[Scraper] EnUcuzSistem scraper baslatiliyor (USE_ENUCUZSISTEM_API=True)...", flush=True)
            all_products = await scrape_enucuzsistem_async()
            save_mock(all_products)
            print(f"[Scraper] TAMAMLANDI - Toplam {len(all_products)} urun", flush=True)
            return all_products
        else:
            print("[Scraper] Bireysel magaza scraper'lari baslatiliyor (USE_ENUCUZSISTEM_API=False)...", flush=True)
            all_products = []
            save_mock(all_products)

            # Sync scraper'lari thread pool'da calistir
            loop = asyncio.get_event_loop()
            sync_results = await asyncio.gather(
                loop.run_in_executor(None, scrape_sinerji),
                loop.run_in_executor(None, scrape_gamegaraj),
                return_exceptions=True,
            )

            for name, r in zip(["Sinerji", "GameGaraj"], sync_results):
                if isinstance(r, list):
                    all_products.extend(r)
                    save_mock(all_products)
                    print(f"[OK] {name} eklendi. Toplam: {len(all_products)}", flush=True)
                else:
                    print(f"[HATA] {name}: {r}", flush=True)

            # Async scraper'lari SIRAYLA calistir
            async def run_and_save(name, coro_fn):
                try:
                    print(f"[Scraper] {name} baslatiliyor...", flush=True)
                    result = await coro_fn()
                    if isinstance(result, list):
                        all_products.extend(result)
                        save_mock(all_products)
                        print(f"[OK] {name} eklendi. Toplam: {len(all_products)}", flush=True)
                except Exception as e:
                    print(f"[HATA] {name}: {e}", flush=True)

            await run_and_save("Vatan", scrape_vatan_async)
            await run_and_save("Itopya", scrape_itopya_async)
            await run_and_save("InceHesap", scrape_incehesap_async)
            await run_and_save("PCKolik", scrape_pckolik_async)
            await run_and_save("GamingGen", scrape_gaminggen_async)
            await run_and_save("Tebilon", scrape_tebilon_async)

            print(f"[Scraper] TAMAMLANDI - Toplam {len(all_products)} urun", flush=True)
            return all_products
    finally:
        _scrape_in_progress = False


class GetProductsRequest(BaseModel):
    page: int = 1
    pageSize: int = 60


class ScrapeRequest(BaseModel):
    stores: Optional[list[str]] = None


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "scrape_in_progress": _scrape_in_progress,
        "product_count": len(load_mock()),
    }


@app.post("/api/getProducts")
def get_products(body: GetProductsRequest):
    products = load_mock()
    total = len(products)
    start = (body.page - 1) * body.pageSize
    end = start + body.pageSize
    return {
        "data": products[start:end],
        "total": total,
        "page": body.page,
        "pageSize": body.pageSize,
    }


@app.post("/api/scrape")
async def trigger_scrape(background_tasks: BackgroundTasks):
    global _scrape_in_progress
    if _scrape_in_progress:
        return {"status": "already_running", "message": "Scraping zaten devam ediyor"}

    background_tasks.add_task(run_all_scrapers)
    return {"status": "started", "message": "Scraping arka planda baslatildi"}


@app.post("/api/scrape/sync")
async def trigger_scrape_sync():
    global _scrape_in_progress
    if _scrape_in_progress:
        return {"status": "already_running"}

    products = await run_all_scrapers()
    return {"status": "done", "total": len(products)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
