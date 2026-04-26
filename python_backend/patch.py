import glob
import os

for file in glob.glob("*.py"):
    if file in ["main.py", "run_scrapers_direct.py", "patch.py"]:
        continue
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Sadece ilk kez değiştiriliyorsa değiştir
    if 'wait_until="domcontentloaded"' not in content:
        content = content.replace(
            "headless=True,", 
            "headless=True,\n        wait_until=\"domcontentloaded\",\n        timeout=60000,"
        )
        with open(file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Patched {file}")
