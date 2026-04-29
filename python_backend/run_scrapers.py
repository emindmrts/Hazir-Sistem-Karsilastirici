"""
run_scrapers.py  —  Tüm scraper'ları aynı anda çalıştır
Rich terminal UI · gerçek zamanlı durum takibi

Kullanım:
    python run_scrapers.py                → tüm scraper'lar
    python run_scrapers.py vatan pckolik  → sadece belirtilen(ler)
    python run_scrapers.py --no-save      → mock.json'a kaydetme
"""

import asyncio
import json
import sys
import os
import time
import argparse
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from threading import Lock
from typing import Optional, Callable

# ── Windows encoding fix ─────────────────────────────────────────────────────
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Scraper imports ──────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))

from scrapers.sinerji      import scrape_all_pages          as scrape_sinerji
from scrapers.gamegaraj    import scrape_all_pages          as scrape_gamegaraj
from scrapers.itopya       import scrape_all_pages_async    as scrape_itopya
from scrapers.vatan        import scrape_all_pages_async    as scrape_vatan
from scrapers.incehesap    import scrape_all_pages_async    as scrape_incehesap
from scrapers.pckolik      import scrape_all_pages_async    as scrape_pckolik
from scrapers.gaminggen    import scrape_all_pages_async    as scrape_gaminggen
from scrapers.tebilon      import scrape_all_pages_async    as scrape_tebilon

# ── Paths ────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).parent.parent
MOCK_JSON  = ROOT / "mock.json"
CACHE_META = ROOT / "cache-meta.json"

# ── Rich ─────────────────────────────────────────────────────────────────────
try:
    from rich.console import Console
    from rich.live    import Live
    from rich.table   import Table
    from rich.panel   import Panel
    from rich.text    import Text
    from rich.align   import Align
    from rich.layout  import Layout
    from rich         import box
    RICH = True
except ImportError:
    RICH = False
    print("[UYARI] 'rich' yükle:  python -m pip install rich\n")

# ── Status ───────────────────────────────────────────────────────────────────
class Status(Enum):
    WAITING = "waiting"
    RUNNING = "running"
    DONE    = "done"
    ERROR   = "error"

# icon, style, label  — sadece Unicode semboller, emoji yok
_STATUS = {
    Status.WAITING: ("·",  "dim white",    "BEKLIYOR"),
    Status.RUNNING: ("►",  "bold yellow",  "CALISIYOR"),
    Status.DONE:    ("✓",  "bold green",   "TAMAM"),
    Status.ERROR:   ("✗",  "bold red",     "HATA"),
}

# ── State ────────────────────────────────────────────────────────────────────
@dataclass
class ScraperState:
    name:       str
    key:        str
    is_async:   bool
    fn:         Callable
    status:     Status         = Status.WAITING
    count:      int            = 0
    elapsed:    float          = 0.0
    error:      str            = ""
    start_time: Optional[float] = None

    def live_elapsed(self) -> float:
        if self.status == Status.RUNNING and self.start_time:
            return time.time() - self.start_time
        return self.elapsed

# ── Registry ─────────────────────────────────────────────────────────────────
ALL_SCRAPERS: list[ScraperState] = [
    ScraperState("Vatan",        "vatan",        True,  scrape_vatan),
    ScraperState("InceHesap",    "incehesap",    True,  scrape_incehesap),
    ScraperState("PCKolik",      "pckolik",      True,  scrape_pckolik),
    ScraperState("GamingGen",    "gaminggen",    True,  scrape_gaminggen),
    ScraperState("Tebilon",      "tebilon",      True,  scrape_tebilon),
    ScraperState("Itopya",       "itopya",       True,  scrape_itopya),
    ScraperState("Sinerji",      "sinerji",      False, scrape_sinerji),
    ScraperState("GameGaraj",    "gamegaraj",    False, scrape_gamegaraj),
]

# ── Shared ───────────────────────────────────────────────────────────────────
_lock         = Lock()
_all_products: list[dict] = []

# ── Persistence ──────────────────────────────────────────────────────────────
def save_products(products: list[dict]) -> None:
    MOCK_JSON.write_text(
        json.dumps(products, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    CACHE_META.write_text(
        json.dumps(
            {"lastUpdated": int(time.time() * 1000), "totalProducts": len(products)},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

# ── Rich UI ──────────────────────────────────────────────────────────────────
def _header() -> Panel:
    t = Text()
    t.append("HAZIR SISTEM  ", style="bold cyan")
    t.append("SCRAPER RUNNER", style="bold white")
    t.append("  —  9 site paralel", style="dim cyan")
    return Panel(Align.center(t), border_style="cyan", padding=(0, 2))


def _table(scrapers: list[ScraperState]) -> Table:
    tbl = Table(
        box=box.ROUNDED,
        border_style="bright_black",
        header_style="bold cyan",
        show_edge=True,
        padding=(0, 1),
        expand=True,
    )
    tbl.add_column("#",      style="dim white", width=3,  justify="right")
    tbl.add_column("",       width=2,           justify="center")   # icon col
    tbl.add_column("Site",   style="bold white", min_width=14)
    tbl.add_column("Durum",  min_width=12)
    tbl.add_column("Urun",   justify="right", width=7,  style="bold green")
    tbl.add_column("Sure",   justify="right", width=9,  style="cyan")
    tbl.add_column("Hata",   style="dim red",  min_width=30)

    for i, s in enumerate(scrapers, 1):
        icon, st, lbl = _STATUS[s.status]
        elapsed_str   = f"{s.live_elapsed():.1f}s" if s.start_time else "-"
        count_str     = str(s.count) if s.count else "-"
        row_bg        = "on grey11" if s.status == Status.RUNNING else ""

        tbl.add_row(
            str(i),
            Text(icon, style=st),
            s.name,
            Text(lbl, style=st),
            count_str,
            elapsed_str,
            s.error[:55],
            style=row_bg,
        )
    return tbl


def _footer(scrapers: list[ScraperState], t0: float) -> Panel:
    done    = sum(1 for s in scrapers if s.status == Status.DONE)
    errors  = sum(1 for s in scrapers if s.status == Status.ERROR)
    running = sum(1 for s in scrapers if s.status == Status.RUNNING)
    total   = len(_all_products)
    elapsed = time.time() - t0

    line = Text()
    line.append(f" ✓ {done}  ", style="bold green")
    line.append(f" ► {running}  ", style="bold yellow")
    line.append(f" ✗ {errors}  ", style="bold red")
    line.append(f" {total} urun  ", style="bold cyan")
    line.append(f" {elapsed:.1f}s ", style="bold white")
    return Panel(Align.center(line), border_style="bright_black", padding=(0, 1))


def _render(scrapers: list[ScraperState], t0: float):
    layout = Layout()
    layout.split_column(
        Layout(_header(),              size=3),
        Layout(_table(scrapers)),
        Layout(_footer(scrapers, t0), size=3),
    )
    return layout

# ── Runners ───────────────────────────────────────────────────────────────────
async def _run_async(state: ScraperState, save: bool) -> None:
    state.status     = Status.RUNNING
    state.start_time = time.time()
    try:
        result = await state.fn()
        state.elapsed = time.time() - state.start_time
        if not isinstance(result, list):
            raise TypeError("Scraper list dondurmedi")
        state.count = len(result)
        if save and result:
            with _lock:
                _all_products.extend(result)
                save_products(_all_products)
        state.status = Status.DONE
    except Exception as exc:
        state.elapsed = time.time() - state.start_time
        state.error   = str(exc)[:120]
        state.status  = Status.ERROR


def _run_sync(state: ScraperState, save: bool) -> None:
    state.status     = Status.RUNNING
    state.start_time = time.time()
    try:
        result = state.fn()
        state.elapsed = time.time() - state.start_time
        if not isinstance(result, list):
            raise TypeError("Scraper list dondurmedi")
        state.count = len(result)
        if save and result:
            with _lock:
                _all_products.extend(result)
                save_products(_all_products)
        state.status = Status.DONE
    except Exception as exc:
        state.elapsed = time.time() - state.start_time
        state.error   = str(exc)[:120]
        state.status  = Status.ERROR

# ── Main ──────────────────────────────────────────────────────────────────────
async def main(scrapers: list[ScraperState], save: bool) -> None:
    t0       = time.time()
    executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="scraper")
    loop     = asyncio.get_event_loop()

    aws: list = []
    for s in scrapers:
        if s.is_async:
            aws.append(asyncio.create_task(_run_async(s, save)))
        else:
            aws.append(loop.run_in_executor(executor, _run_sync, s, save))

    # ── Rich live ────────────────────────────────────────────────────────────
    if RICH:
        console = Console()

        async def _refresh(live: Live) -> None:
            while True:
                live.update(_render(scrapers, t0))
                await asyncio.sleep(0.2)

        with Live(_render(scrapers, t0), console=console, refresh_per_second=5) as live:
            refresh_task = asyncio.create_task(_refresh(live))
            await asyncio.gather(*aws, return_exceptions=True)
            refresh_task.cancel()
            live.update(_render(scrapers, t0))

        # ── Final table ──────────────────────────────────────────────────────
        total_elapsed = time.time() - t0
        final = Table(
            box=box.DOUBLE_EDGE,
            border_style="cyan",
            header_style="bold cyan",
            title="[bold cyan]SCRAPING TAMAMLANDI[/bold cyan]",
            expand=False,
        )
        final.add_column("",       width=2,  justify="center")
        final.add_column("Site",   style="bold white", min_width=14)
        final.add_column("Durum",  min_width=12)
        final.add_column("Urun",   justify="right", style="bold green", width=7)
        final.add_column("Sure",   justify="right", style="cyan", width=9)
        final.add_column("Hata",   style="dim red",  min_width=30)

        for s in scrapers:
            icon, st, lbl = _STATUS[s.status]
            final.add_row(
                Text(icon, style=st),
                s.name,
                Text(lbl, style=st),
                str(s.count) if s.count else "-",
                f"{s.elapsed:.1f}s",
                s.error[:50],
            )

        console.print()
        console.print(final)
        console.print()
        saved_line = (
            f"[dim]Kaydedildi  ->  {MOCK_JSON}[/dim]"
            if save else
            "[dim yellow]Kaydetme devre disi (--no-save)[/dim yellow]"
        )
        console.print(Panel(
            f"[bold green]✓  Toplam {len(_all_products)} urun  ·  {total_elapsed:.1f}s[/bold green]\n"
            + saved_line,
            border_style="green",
            title="[bold green]OZET[/bold green]",
        ))

    else:
        # ── Plain fallback ───────────────────────────────────────────────────
        while not all(s.status in (Status.DONE, Status.ERROR) for s in scrapers):
            os.system("cls" if sys.platform == "win32" else "clear")
            print("=" * 58)
            print("  HAZIR SISTEM SCRAPER RUNNER")
            print("=" * 58)
            for s in scrapers:
                icon, _, lbl = _STATUS[s.status]
                print(f"  {icon}  {s.name:<15}  {lbl:<12}  {s.count:>4} urun  {s.live_elapsed():.1f}s")
            print(f"\n  TOPLAM: {len(_all_products)} urun  |  {time.time() - t0:.1f}s")
            await asyncio.sleep(1)

        await asyncio.gather(*aws, return_exceptions=True)

    executor.shutdown(wait=False)


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Tum scraper'lari paralel calistir",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "sites",
        nargs="*",
        metavar="SITE",
        help=(
            "Calistirilacak siteler (bos = hepsi).\n"
            "Gecerli: " + ", ".join(s.key for s in ALL_SCRAPERS)
        ),
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="mock.json'a kaydetme",
    )
    args = parser.parse_args()

    if args.sites:
        keys     = {k.lower() for k in args.sites}
        selected = [s for s in ALL_SCRAPERS if s.key in keys]
        if not selected:
            print(f"[HATA] Gecersiz site: {args.sites}")
            print("Gecerli:", ", ".join(s.key for s in ALL_SCRAPERS))
            sys.exit(1)
    else:
        selected = ALL_SCRAPERS

    save = not args.no_save
    if save:
        _all_products.clear()
        save_products([])

    asyncio.run(main(selected, save))

    try:
        input("\n  Devam etmek icin Enter'a basin...")
    except (EOFError, KeyboardInterrupt):
        pass
