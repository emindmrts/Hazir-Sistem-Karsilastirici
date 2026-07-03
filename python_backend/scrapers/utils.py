
import re

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
        if not (rated or named):
            continue
        watt = re.search(r"(\d{3,4})\s?w(?:att)?(?![a-z0-9])", n)
        parts = []
        if watt:
            parts.append(f"{watt.group(1)}W")
        if rated:
            parts.append("80+")
        if parts:
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


def extract_specs_from_name(name: str) -> dict:
    """Fallback: extract basic specs from a product name string using regex."""
    specs = dict(EMPTY_SPECS)
    if not name:
        return specs

    # CPU
    cpu_match = re.search(
        r"(INTEL[\w\s-]+|AMD[\w\s-]+|Ryzen\s+\d[\w\s-]*|Core\s+(?:Ultra\s+)?[\w-]+|i[3579]-\d+[\w-]*)",
        name, re.IGNORECASE)
    if cpu_match:
        cpu = re.split(r"\s+RTX|\s+RX|\s+GTX|\s+ARC|\s*-", cpu_match.group(1), flags=re.IGNORECASE)[0].strip()
        specs["CPU"] = cpu

    # GPU
    gpu_match = re.search(r"((?:RTX|GTX|RX|ARC|RADEON)\s*\d+[\w\s]*)", name, re.IGNORECASE)
    if gpu_match:
        specs["GPU"] = re.split(r"\s*-", gpu_match.group(1), flags=re.IGNORECASE)[0].strip()

    # RAM
    ram_match = re.search(r"(\d+\s*GB(?:\s*DDR\d)?(?:\s*RAM|\s*Bellek)?)", name, re.IGNORECASE)
    if ram_match:
        specs["RAM"] = ram_match.group(1).strip()

    # Storage
    storage_match = re.search(r"(\d+(?:\s*GB|\s*TB)\s*(?:M\.2\s*)?(?:SSD|HDD|NVME|M\.2|SATA))", name, re.IGNORECASE)
    if storage_match:
        specs["Storage"] = storage_match.group(1).strip()

    return specs
