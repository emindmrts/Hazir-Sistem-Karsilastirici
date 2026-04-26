import os
import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Ensure class method call instead of instance
    content = content.replace('StealthyFetcher().async_fetch', 'StealthyFetcher.async_fetch')
    
    # 2. Fix spec keys capitalization (Use exactly what's in GameGaraj if it's "correct")
    # GameGaraj uses: CPU, Motherboard, GPU, RAM, Storage
    content = content.replace('"Ram"', '"RAM"')
    content = content.replace('"SSD"', '"Storage"')
    content = content.replace("'SSD'", "'Storage'")
    
    # 3. Ensure store names match JS ones (gamingGen, inceHesap, pckolik, etc.)
    content = content.replace('"gaminggen"', '"gamingGen"')
    content = content.replace('"incehesap"', '"inceHesap"')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

scrapers = [
    'itopya.py', 'vatan.py', 'incehesap.py', 'pckolik.py', 
    'gaminggen.py', 'gencergaming.py', 'sinerji.py', 'tebilon.py'
]

for s in scrapers:
    path = os.path.join('c:\\Users\\iremd\\Desktop\\Hazir-Sistem-Karsilastirici\\python_backend', s)
    if os.path.exists(path):
        print(f"Patching {s}...")
        patch_file(path)

print("Done!")
