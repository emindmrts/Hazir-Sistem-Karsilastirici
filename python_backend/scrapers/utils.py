
import re

def extract_specs_from_list(spec_items: list[str]) -> dict:
    """
    Extracts structured PC specifications from a list of strings using keyword matching.
    """
    specs = {
        "CPU": "N/A",
        "Motherboard": "N/A",
        "GPU": "N/A",
        "RAM": "N/A",
        "Storage": "N/A",
        "Case": "N/A",
        "PSU": "N/A",
        "Cooler": "N/A"
    }
    
    if not spec_items:
        return specs

    def find(kws, exclude=None):
        if exclude is None: exclude = []
        for item in spec_items:
            lower_item = item.lower()
            if any(e.lower() in lower_item for e in exclude):
                continue
            if any(k.lower() in lower_item for k in kws):
                return item.strip()
        return "N/A"

    specs["CPU"] = find(["islemci", "cpu", "ryzen", "intel", "core i", " r3 ", " r5 ", " r7 ", " r9 ", " ultra "])
    specs["Motherboard"] = find(["anakart", "mb", "b450", "b550", "a520", "h610", "b650", "a620", "b760", "z790", "b660", "x670", "h510", "h810", "b840", "b850", "x870"])
    specs["GPU"] = find(["rtx", "gtx", "rx ", "arc", "radeon", "ekran karti", " 5070", " 5080", " 5090", " 5060"])
    specs["RAM"] = find(["mhz", "ram", "ddr", "cl1", "cl2", "bellek", " 8gb", " 16gb", " 32gb", " 64gb"], exclude=["ekran kart", "rtx", "rx ", "gtx"])
    specs["Storage"] = find(["ssd", "m.2", "nvme", "tb", "gb hdd", "sata3", " 500gb", " 512gb", " 1tb", " 2tb"], exclude=["ekran kart", "rtx", "rx ", "gtx"])
    specs["Case"] = find(["kasa", "case", "tower"])
    specs["PSU"] = find(["psu", "power supply", "guc kaynagi", " 80+", "watt", "750w", "650w", "600w", "550w", "500w", "850w"])
    specs["Cooler"] = find(["sogutucu", "cooler", "fan", "sivi sogutma", "liquid cooling"])


    return specs

def extract_specs_from_name(name: str) -> dict:
    """
    Fallback method to extract basic specs from a product name string using Regex.
    """
    specs = {
        "CPU": "N/A",
        "Motherboard": "N/A",
        "GPU": "N/A",
        "RAM": "N/A",
        "Storage": "N/A",
        "Case": "N/A",
        "PSU": "N/A",
        "Cooler": "N/A"
    }
    
    if not name:
        return specs

    # CPU Match
    cpu_match = re.search(r"(INTEL[\w\s-]+|AMD[\w\s-]+|INTE\s+U\d[\w\s-]+|Ryzen\s+\d[\w\s-]+|i[3579]-\d+[\w-]*)", name, re.IGNORECASE)
    if cpu_match:
        specs["CPU"] = cpu_match.group(1).strip()
        # Clean up if GPU or other stuff leaked in
        specs["CPU"] = re.split(r"\s+RTX|\s+RX|\s+GTX|\s+ARC|\s*-", specs["CPU"], flags=re.IGNORECASE)[0].strip()

    # GPU Match
    gpu_match = re.search(r"((?:RTX|GTX|RX|ARC|RADEON)\s*\d+[\w\s]*)", name, re.IGNORECASE)
    if gpu_match:
        specs["GPU"] = gpu_match.group(1).strip()
        specs["GPU"] = re.split(r"\s*-", specs["GPU"], flags=re.IGNORECASE)[0].strip()

    # RAM Match
    ram_match = re.search(r"(\d+\s*GB(?:\s*DDR\d)?(?:\s*RAM|\s*Bellek)?)", name, re.IGNORECASE)
    if ram_match:
        specs["RAM"] = ram_match.group(1).strip()

    # Storage Match
    storage_match = re.search(r"(\d+(?:\s*GB|\s*TB)\s*(?:M\.2\s*)?(?:SSD|HDD|NVME|M\.2|SATA))", name, re.IGNORECASE)
    if storage_match:
        specs["Storage"] = storage_match.group(1).strip()

    return specs
