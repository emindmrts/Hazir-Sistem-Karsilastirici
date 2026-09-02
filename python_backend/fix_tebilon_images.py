"""fix_tebilon_images.py — mock.json'lardaki tebilon.com görsel URL'lerini
yerel /tebilon/ yollarina cevirir (Cloudflare 403 nedeniyle).
Repo root'una gore calisir; local ve VDS'te ayni sekilde kullanilir."""
import json
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
TB_DIR = ROOT / "client" / "public" / "tebilon"
HAVE = {f.name for f in TB_DIR.iterdir()} if TB_DIR.is_dir() else set()
HAVE_LOWER = {f.lower(): f for f in HAVE}


def map_image(url):
    if not url or not isinstance(url, str):
        return url
    if not url.startswith("https://www.tebilon.com"):
        return url  # hepsiburada/dsmcdn calisiyor, dokunma
    fname = url.rsplit("/", 1)[-1]
    if fname in HAVE:
        return "/tebilon/" + fname
    exact = HAVE_LOWER.get(fname.lower())
    if exact:
        return "/tebilon/" + exact
    return "/tebilon/placeholder.svg"


def process(path: Path):
    if not path.exists():
        print(f"[SKIP] {path}")
        return
    data = json.loads(path.read_text(encoding="utf-8"))
    changed = 0
    for p in data:
        if p.get("store") != "tebilon":
            continue
        old = p.get("image") or p.get("img")
        if old and old.startswith("https://www.tebilon.com"):
            new = map_image(old)
            if new != old:
                p["image"] = new
                changed += 1
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[OK] {path.name}: {changed} gorsel yerellestirildi")


process(ROOT / "mock.json")
process(ROOT / "client" / "public" / "mock.json")
process(ROOT / "client" / "dist" / "mock.json")
