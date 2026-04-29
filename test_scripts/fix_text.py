import os

scrapers = ['gamegaraj.py', 'gaminggen.py', 'gencergaming.py', 'incehesap.py', 'itopya.py', 'pckolik.py', 'sinerji.py', 'tebilon.py']

for file in scrapers:
    if not os.path.exists(file): continue
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace specific patterns
    content = content.replace("li.text.strip() for li", "(li.get_all_text() if hasattr(li, 'get_all_text') else li.text).strip() for li")
    content = content.replace("p.text.strip() for p", "(p.get_all_text() if hasattr(p, 'get_all_text') else p.text).strip() for p")
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print('Fixed spec_items extraction.')
