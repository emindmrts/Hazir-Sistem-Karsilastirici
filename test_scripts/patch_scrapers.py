import os, re

scrapers = ['gamegaraj.py', 'gaminggen.py', 'gencergaming.py', 'incehesap.py', 'itopya.py', 'pckolik.py', 'sinerji.py', 'tebilon.py']

regex_logic = '''
        specs = {
            "CPU": "N/A",
            "Motherboard": "N/A",
            "GPU": "N/A",
            "RAM": "N/A",
            "Storage": "N/A",
        }

        if 'spec_items' in locals() and spec_items:
            def find(*kws):
                return next((x for x in spec_items if any(k.lower() in x.lower() for k in kws)), "N/A")
            specs["CPU"] = find("islemci", "cpu", "ryzen", "core", "intel", "amd", "i3", "i5", "i7", "i9", "r3", "r5", "r7", "r9")
            specs["Motherboard"] = find("anakart", "mb", "b450", "b550", "a520", "h610", "b650", "a620", "b760", "z790", "b660", "x670")
            specs["GPU"] = find("rtx", "gtx", "rx ", "arc", "radeon", "ekran")
            specs["RAM"] = find("mhz", "ram", "ddr", "cl")
            specs["Storage"] = find("ssd", "m.2", "nvme", "tb")

        if name:
            import re
            if specs["CPU"] == "N/A":
                cpu_match = re.search(r"(INTEL[\\w\\s]+|AMD[\\w\\s]+|INTE\\s+U\\d[\\w\\s]+)", name, re.IGNORECASE)
                if cpu_match:
                    specs["CPU"] = cpu_match.group(1).strip()
                    specs["CPU"] = re.split(r"\\s+RTX|\\s+RX|\\s+GTX|\\s+ARC|\\s*-", specs["CPU"], flags=re.IGNORECASE)[0].strip()
            
            if specs["GPU"] == "N/A":
                gpu_match = re.search(r"((?:RTX|GTX|RX|ARC|RADEON)\\s*\\d+[\\w\\s]*)", name, re.IGNORECASE)
                if gpu_match:
                    specs["GPU"] = gpu_match.group(1).strip()
                    specs["GPU"] = re.split(r"\\s*-", specs["GPU"], flags=re.IGNORECASE)[0].strip()
                
            if specs["Storage"] == "N/A":
                storage_match = re.search(r"(\\d+\\s*(?:GB|TB)\\s*(?:M\\.2\\s*)?(?:SSD|HDD|NVME))", name, re.IGNORECASE)
                if storage_match:
                    specs["Storage"] = storage_match.group(1).strip()
                
            if specs["RAM"] == "N/A":
                ram_match = re.search(r"(\\d+\\s*GB(?:\\s*DDR\\d)?\\s*RAM|RAM)", name, re.IGNORECASE)
                if ram_match:
                    specs["RAM"] = ram_match.group(1).strip()
                
            if specs["Motherboard"] == "N/A":
                mb_match = re.search(r"((?:[AHBZX]\\d{3}[A-Z]*(?:-\\w+)?)(?:\\s*DDR\\d)?(?:\\s*WIFI)?(?:\\s*PRO)?(?:\\s*PLUS)?)", name, re.IGNORECASE)
                if mb_match:
                    specs["Motherboard"] = mb_match.group(1).strip()
'''

for file in scrapers:
    if not os.path.exists(file): continue
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the existing block to replace. It starts with specs = { and ends before products.append
    # In our patched files, it looks like:
    # specs = { ... }
    # if name: ...
    #             specs["Motherboard"] = mb_match.group(1).strip()
    # 
    #         products.append(
    
    spec_block_pattern = re.compile(r'\s*specs\s*=\s*\{.*?(?=\s*products\.append)', re.DOTALL)
    content = spec_block_pattern.sub(lambda m: regex_logic, content)
    
    # remove duplicate import re at top
    content = re.sub(r'\nimport re\n', '\n', content)
    content = 'import re\n' + content.lstrip()
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print('Patched files with fallback logic.')
