
import re
import os
import json

EMPTY_SPECS = {
    "CPU": "N/A",
    "Motherboard": "N/A",
    "GPU": "N/A",
    "RAM": "N/A",
    "Storage": "N/A",
    "Case": "N/A",
    "PSU": "N/A",
    "Cooler": "N/A",
}

_TR_MAP = str.maketrans({
    "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u",
    "Ç": "c", "Ğ": "g", "İ": "i", "I": "i", "Ö": "o", "Ş": "s", "Ü": "u",
})


def _norm(s: str) -> str:
    """Lowercase + fold Turkish characters so ASCII keywords match reliably."""
    if not s:
        return ""
    return s.translate(_TR_MAP).lower()


# Keywords that must match as a full word (no trailing letters). Used for short
# ambiguous tokens like "arc" (GPU family) so they don't fire on "arctic".
_EXACT = {"arc", "aio", "psu", "cpu", "case"}


def _has_word(text: str, kw: str) -> bool:
    """Keyword match on already-normalized text.

    A leading boundary stops false positives such as ``mb`` matching ``96mb`` or
    ``mhz`` matching ``8400mhz``. Trailing letters are allowed by default so
    Turkish suffixes still match (``kasa`` → ``kasasi``, ``sogutucu`` →
    ``sogutucusu``, ``anakart`` → ``anakarti``). Keywords in ``_EXACT`` require a
    full boundary on both sides.
    """
    tail = r"(?![a-z0-9])" if kw in _EXACT else r"(?![0-9])"
    return re.search(r"(?<![a-z0-9])" + re.escape(kw) + tail, text) is not None


def _has_any(text: str, kws) -> bool:
    return any(_has_word(text, kw) for kw in kws)


# Ordered so that ambiguous items land in the right bucket. Each rule:
#   (category, positive keywords, negative keywords, extra regex or None)
# The first category whose keywords match (and none of whose negatives match)
# claims the item. Order matters: e.g. a CPU cooler string contains "islemci"
# so Cooler must be tried before CPU; a RAM stick advertised as "sogutuculu"
# (with heatsink) must be tried before Cooler.
_RULES = [
    ("GPU", ["ekran karti", "ekran kart", "geforce", "radeon", "grafik islemci", "arc"],
     [], r"(?<![a-z0-9])(rtx|gtx)\s?\d{3,4}|(?<![a-z0-9])rx\s?\d{3,4}"),
    ("Motherboard", ["anakart", "motherboard", "mainboard"], ["ekran"],
     r"(?<![a-z0-9])[abhxz]\d{3}[a-z]{0,2}(?![a-z0-9])"),
    # Case comes before PSU/Cooler: many cases bundle a PSU ("650W 80Plus ... Kasa")
    # or carry the "Cooler Master" brand, and the item is fundamentally the case.
    ("Case", ["kasa", "case", "tower", "kabin"], [], None),
    ("PSU", ["guc kaynagi", "power supply", "psu"], [],
     r"(?<![a-z0-9])(80\s?\+|80\s?plus)"),
    ("RAM", ["ram", "bellek"], ["anakart", "ekran", "ssd", "hdd", "kasa"],
     r"(?<![a-z0-9])ddr[45](?![a-z0-9])"),
    ("Storage", ["ssd", "hdd", "nvme", "m.2", "sata"], ["ekran", "anakart"],
     r"\d+\s?(gb|tb)\s?(ssd|hdd|nvme|m\.2)"),
    ("Cooler", ["sogutucu", "sogutma", "cooler", "sivi sogutma", "liquid cooling", "aio"],
     ["ram", "bellek"], None),
    ("CPU", ["islemci", "cpu", "ryzen", "intel", "core i", "core ultra", "processor"],
     ["sogutucu", "anakart"],
     r"(?<![a-z0-9])r[3579](?![a-z0-9])|(?<![a-z0-9])i[3579]-\d"),
]


def _classify(item: str) -> str | None:
    """Return the single spec category an item belongs to, or None."""
    n = _norm(item)
    if not n:
        return None
    for category, pos, neg, rx in _RULES:
        if _has_any(n, neg):
            continue
        if _has_any(n, pos) or (rx and re.search(rx, n)):
            return category
    return None


def _psu_from_text(items: list[str]) -> str | None:
    """Pull a bundled PSU rating (e.g. "650W 80+") out of any item — used when a
    case ships with an integrated power supply and there is no separate PSU line.
    """
    for it in items:
        n = _norm(it)
        rated = re.search(r"80\s?\+|80\s?plus", n)
        named = "guc kaynagi" in n or "power supply" in n
        has_case_kw = _has_word(n, "kasa") or _has_word(n, "case") or _has_word(n, "tower")
        if not (rated or named or has_case_kw):
            continue
        watt = re.search(r"(\d{3,4})\s?w(?:att)?(?![a-z0-9])", n)
        if not watt:
            continue
        parts = [f"{watt.group(1)}W"]
        if rated:
            parts.append("80+")
        return " ".join(parts)
    return None


def extract_specs_from_list(spec_items: list[str]) -> dict:
    """Extract structured PC specifications from a list of component strings.

    Each item is assigned to exactly one category (the first item wins per
    category), which avoids one string leaking into several fields.
    """
    specs = dict(EMPTY_SPECS)
    if not spec_items:
        return specs

    for item in spec_items:
        item = (item or "").strip()
        if not item:
            continue
        category = _classify(item)
        if category and specs[category] == "N/A":
            specs[category] = " ".join(item.split())

    if specs["PSU"] == "N/A":
        psu = _psu_from_text(spec_items)
        if psu:
            specs["PSU"] = psu

    return specs


def extract_specs_from_attributes(attrs: dict) -> dict:
    """Map a label->value attribute table (e.g. WooCommerce ``shop_attributes``)
    onto spec fields. Only fills fields that have a matching labelled attribute;
    everything else stays ``N/A``.
    """
    specs = dict(EMPTY_SPECS)
    if not attrs:
        return specs

    norm = {_norm(k): (v or "").strip() for k, v in attrs.items()}

    def pick(*label_fragments):
        for label, val in norm.items():
            if not val:
                continue
            if any(frag in label for frag in label_fragments):
                return " ".join(val.split())
        return None
    cpu = pick("islemci modeli") or pick("islemci serisi")
    if cpu:
        specs["CPU"] = cpu
    mb = pick("cipset")
    if mb:
        specs["Motherboard"] = mb
    gpu = pick("grafik islemci modeli") or pick("grafik islemci serisi")
    if gpu:
        specs["GPU"] = gpu
    ram = pick("ram kapasitesi")
    if ram:
        ram_type = pick("ram tipi")
        ram_speed = pick("ram hizi")
        specs["RAM"] = " ".join(x for x in [ram, ram_type, ram_speed] if x)
    storage = pick("depolama kapasitesi")
    if storage:
        stype = pick("depolama tipi")
        specs["Storage"] = " ".join(x for x in [storage, stype] if x)
    case = pick("kasa")
    if case:
        specs["Case"] = case
    psu = pick("guc kaynagi")
    if psu:
        specs["PSU"] = psu
    cooler = pick("sogutma yontemi") or pick("sogutucu")
    if cooler:
        radiator = pick("radyator boyutu")
        specs["Cooler"] = " ".join(x for x in [cooler, radiator] if x)

    return specs


def merge_specs(base: dict, extra: dict) -> dict:
    """Fill ``N/A`` fields in ``base`` from ``extra`` (in place)."""
    for k in EMPTY_SPECS:
        if base.get(k, "N/A") in (None, "", "N/A") and extra.get(k, "N/A") not in (None, "", "N/A"):
            base[k] = extra[k]
    return base


# Label fragments → spec category.  Order matters: more specific labels first
# (e.g. "ekran karti hafizasi" must not claim "Ekran Kartı" before the GPU row).
_LABEL_RULES = [
    ("CPU",       ["islemci modeli", "islemci serisi", "islemci", "processor", "cpu"]),
    ("Motherboard", ["anakart", "motherboard", "mainboard", "cipset", "chipset"]),
    ("GPU",       ["ekran karti modeli", "ekran karti serisi", "ekran karti", "grafik islemci", "gpu", "graphics"]),
    ("RAM",       ["ram kapasitesi", "ram tipi", "ram hizi", "ram", "bellek", "memory"]),
    ("Storage",   ["depolama kapasitesi", "depolama tipi", "ssd", "hdd", "depolama", "sabit disk", "storage"]),
    ("Cooler",    ["sogutma yontemi", "sogutucu", "cooler", "sogutma", "heatsink"]),
    ("Case",      ["kasa", "case", "kabin", "chassis"]),
    ("PSU",       ["guc kaynagi", "power supply", "psu"]),
]

_SUB_ATTR = ("hizi", "hiz", "hafizasi", "hafiza", "bellek tipi", "bellek arayuzu",
             "max. ram", "isletim sistemi", "serisi", "modeli", "powered by",
             "monitor", "monitorsuz", "ekran karti serisi", "islemci modeli",
             "ekran karti hafizasi")


def _label_to_category(label: str) -> str | None:
    """Map a Turkish/English spec-table label to a spec category, or None."""
    n = _norm(label)
    if not n:
        return None
    for category, frags in _LABEL_RULES:
        for frag in frags:
            if frag in n:
                return category
    return None


def extract_specs_from_table(rows: list[tuple[str, str]]) -> dict:
    """Extract specs from a label→value table.

    Used for detail pages whose spec list is a 2-column table
    (``<th>İşlemci</th><td>AMD Ryzen 5 7500F</td>``) or a single-column
    "Label: Value" cell list (gamegaraj).  Skips secondary labels such as
    "İşlemci Hızı", "Ekran Kartı Hafızası" because they are sub-attributes
    that would overwrite the primary component field.
    """
    specs = dict(EMPTY_SPECS)
    if not rows:
        return specs

    filled = set()
    for label, value in rows:
        if not value or value.lower() in ("yok", "no", "-"):
            continue
        n_label = _norm(label)
        if any(sub in n_label for sub in _SUB_ATTR):
            continue
        cat = _label_to_category(label)
        if cat and cat not in filled:
            specs[cat] = " ".join(value.split())
            filled.add(cat)
    return specs


# ── Detail-page cache ─────────────────────────────────────────────────────────
# Product detail pages (Case/PSU/Cooler for tebilon, PSU/Cooler for gamingGen)
# are the slow part of scraping because the source sites rate-limit. The specs on
# those pages are stable per product URL, while price/stock come fresh from the
# listing page — so caching detail-derived specs by URL makes re-runs near
# instant. Delete the cache file (or set SCRAPER_NO_CACHE=1) to force a full
# refetch.

_CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", ".detail_cache.json")
_CACHE_DISABLED = os.environ.get("SCRAPER_NO_CACHE") == "1"


def load_detail_cache() -> dict:
    """Return the persisted url -> {spec: value} cache (empty if disabled/missing)."""
    if _CACHE_DISABLED:
        return {}
    try:
        with open(_CACHE_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def save_detail_cache(cache: dict) -> None:
    """Persist the cache, merging with whatever is on disk. Merging keeps entries
    written by another store that scrapes concurrently into the same file."""
    if _CACHE_DISABLED or not cache:
        return
    merged = load_detail_cache()
    merged.update(cache)
    try:
        with open(_CACHE_PATH, "w", encoding="utf-8") as fh:
            json.dump(merged, fh, ensure_ascii=False)
    except OSError:
        pass


def cacheable_specs(specs: dict) -> dict:
    """Keep only the resolved (non-N/A) fields worth caching."""
    return {k: v for k, v in specs.items()
            if k in EMPTY_SPECS and v not in (None, "", "N/A")}


def _clean(s: str) -> str:
    return " ".join(s.split())


def extract_specs_from_name(name: str) -> dict:
    """Extract structured PC specs from a product name or URL slug.

    Handles hyphens, underscores, slashes and other separators common in URL
    slugs (``phoenix-9060xt-amd-ryzen-5-7500f-...``) by normalising them to
    spaces before pattern matching.  Returns the best-effort spec fields;
    anything not found stays ``"N/A"``.
    """
    specs = dict(EMPTY_SPECS)
    if not name:
        return specs

    # Normalise separators → spaces (case preserved for display)
    text = re.sub(r"[-_/]+", " ", name)
    text = re.sub(r"\s+", " ", text).strip()
    # Split merged patterns common in URL slugs: "ddr4500gb" → "ddr4 500gb",
    # "8gb16gb" → "8gb 16gb"  (missing hyphens in some itopya slugs)
    text = re.sub(r"(ddr[45])(\d)", r"\1 \2", text, flags=re.IGNORECASE)
    text = re.sub(r"(\dgb)(\d)", r"\1 \2", text, flags=re.IGNORECASE)
    n = _norm(text)  # Turkish-folded lowercase for keyword matching

    # ── GPU ──────────────────────────────────────────────────────────────────
    # Radeon RX 9060 XT 8GB · GeForce RTX 4060 Ti · RTX 5060 · RX 7600 · GTX 1650 · Arc A750 · GT 730
    gpu_m = re.search(
        r"\b((?:radeon\s+|geforce\s+)?(?:rtx|gtx|rx|arc\s+a|gt)\s*\d{3,4}\s*"
        r"(?:ti|xt|super)?(?:\s*\d+\s*gb?)?)",
        text, re.IGNORECASE)
    if gpu_m:
        specs["GPU"] = _clean(gpu_m.group(1))

    # ── CPU ──────────────────────────────────────────────────────────────────
    cpu_patterns = [
        r"(?:amd\s+)?ryzen\s+(?:\d\s+)?\d{3,5}\w*",     # AMD Ryzen 5 7500F · Ryzen 5500
        r"(?:amd\s+)?r[3579]\s+\d{3,5}\w*",              # AMD R5 7500F · R7 5700
        r"intel\s+(?:core\s+)?ultra\s+\d\s+\d{3,5}\w*",  # Intel Core Ultra 5 225F
        r"intel\s+(?:core\s+)?[iu][3579]\s+\d{3,5}\w*",  # Intel Core i5 12600KF · Intel i5 12400
        r"intel\s+(?:core\s+)?\d{3,5}\w*",                # Intel Core 12100
        # AMD bare model (when "Ryzen"/"R7" prefix is dropped): "AMD 7700X" · "AMD 5500"
        r"amd\s+\d{3,5}\w*",
    ]
    for pat in cpu_patterns:
        cpu_m = re.search(pat, text, re.IGNORECASE)
        if cpu_m:
            specs["CPU"] = _clean(cpu_m.group(0))
            break

    # ── Motherboard (chipset) ────────────────────────────────────────────────
    # A620M · H610M · B840M · X670E · Z790 · A520 · H810M …
    for mb_m in re.finditer(r"\b([abhxz]\d{3}[a-z]{0,2})\b", text, re.IGNORECASE):
        start = mb_m.start()
        before = _norm(text[max(0, start - 5):start])
        if "arc" in before:          # "Arc A750" is a GPU, not a chipset
            continue
        specs["Motherboard"] = mb_m.group(1)
        break

    # ── RAM ──────────────────────────────────────────────────────────────────
    # 16GB DDR5 · 8GB DDR4 · 32GB RAM · 16GB Bellek · DDR5 32GB (DDR prefix)
    # Requires a DDR/RAM/Bellek keyword so storage capacities ("500GB SSD") are
    # not picked up as RAM.
    ram_m = (re.search(r"(\d+\s*gb\s*(?:ddr[45]|ram|bellek))", text, re.IGNORECASE)
             or re.search(r"((?:ddr[45])\s*\d+\s*gb)", text, re.IGNORECASE))
    if ram_m:
        specs["RAM"] = _clean(ram_m.group(1))

    # ── Storage ──────────────────────────────────────────────────────────────
    # 500GB NVMe M.2 SSD · 1TB SSD · 512GB M.2 SSD · 240GB SSD · 500GB (bare)
    # Exclude capacities that are part of GPU (VRAM) or RAM (DDR/Bellek) matches,
    # and prefer candidates that carry a storage keyword (SSD/HDD/NVMe/M.2).
    _exclude = []
    if gpu_m:
        _exclude.append(gpu_m.span())
    if ram_m:
        _exclude.append(ram_m.span())

    storage_candidates = []
    for sm in re.finditer(
        r"\d+\s*(?:gb|tb)(?:\s+(?:nvme|m\.?\s*2|ssd|hdd|sata))*",
        text, re.IGNORECASE):
        s, e = sm.span()
        if any(s < e2 and s2 < e for s2, e2 in _exclude):
            continue
        has_kw = bool(re.search(r"(?:nvme|m\.?\s*2|ssd|hdd|sata)", sm.group(0), re.IGNORECASE))
        # For bare capacities (no storage keyword), skip if followed by DDR/RAM
        if not has_kw:
            tail = _norm(text[e:e + 12])
            if "ddr" in tail or "ram" in tail or "bellek" in tail:
                continue
        storage_candidates.append(sm)

    if storage_candidates:
        with_kw = [c for c in storage_candidates
                   if re.search(r"(?:nvme|m\.?\s*2|ssd|hdd|sata)", c.group(0), re.IGNORECASE)]
        if with_kw:
            chosen = with_kw[0]
        else:
            # No storage keyword anywhere — prefer TB over GB (RAM is never TB)
            # so "1tb 32gb" → Storage="1tb", RAM stays separate.
            tb = [c for c in storage_candidates
                  if re.search(r"\d+\s*tb", c.group(0), re.IGNORECASE)]
            chosen = tb[0] if tb else storage_candidates[0]
        specs["Storage"] = _clean(chosen.group(0))

    # ── Case ─────────────────────────────────────────────────────────────────
    for kw in ("kasa", "case", "tower", "kabin", "chassis"):
        idx = n.find(kw)
        if idx >= 0:
            start = max(0, idx - 20)
            end = min(len(text), idx + len(kw) + 25)
            specs["Case"] = _clean(text[start:end])[:50]
            break

    # ── PSU ──────────────────────────────────────────────────────────────────
    psu_watt_m = re.search(r"(\d{3,4})\s*w(?:att)?(?![a-z])", text, re.IGNORECASE)
    if psu_watt_m:
        watt = psu_watt_m.group(1)
        plus_m = re.search(
            r"(80\s*\+\s*(?:bronze|gold|silver|platinum|titanium)?"
            r"|80\s*plus\s*(?:bronze|gold|silver|platinum|titanium)?)",
            text, re.IGNORECASE)
        specs["PSU"] = f"{watt}W 80+" if plus_m else f"{watt}W"

    # ── Cooler ───────────────────────────────────────────────────────────────
    for kw in ("sogutucu", "sogutma", "sivi sogutma", "cooler", "aio", "liquid"):
        idx = n.find(kw)
        if idx >= 0:
            start = max(0, idx - 20)
            end = min(len(text), idx + len(kw) + 25)
            candidate = _clean(text[start:end])[:50]
            # Reject candidate if it contains storage keywords (garbage from
            # URL slugs like "500gb-nvme-m2-ssd-120mm-hava-sogutucu").
            if not re.search(r'\b(ssd|nvme|m\.?\s*2|hdd)\b', candidate, re.IGNORECASE):
                specs["Cooler"] = candidate
            break

    return specs
