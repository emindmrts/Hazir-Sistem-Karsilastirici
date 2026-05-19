import glob
import os

for f in glob.glob('c:/Users/samsu/Desktop/HAZIR SİSTEM/Hazir-Sistem-Karsilastirici/python_backend/scrapers/*.py'):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    if ', stealthy_headers=True' in content:
        content = content.replace(', stealthy_headers=True', '')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Fixed {os.path.basename(f)}")
