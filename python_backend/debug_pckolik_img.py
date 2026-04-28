import asyncio
from scrapling.fetchers import StealthyFetcher

async def main():
    try:
        page = await StealthyFetcher.async_fetch('https://pckolik.com.tr/kategori/oem-paketler')
        card = page.css('.product-card').first
        if card:
            print('--- FIRST CARD ---')
            print(f"Name: {card.css('.name').first.text.strip() if card.css('.name').first else 'N/A'}")
            
            # Look at all images
            imgs = card.css('img')
            for i, img in enumerate(imgs):
                src = img.attrib.get('src', 'N/A')
                dsrc = img.attrib.get('data-src', 'N/A')
                alt = img.attrib.get('alt', 'N/A')
                parent = img.parent.attrib.get('class', 'N/A')
                print(f"Img {i}: src={src}, data-src={dsrc}, alt={alt}, parent_class={parent}")
                
            # Check .img-left
            img_left = card.css('.img-left img').first
            if img_left:
                print(f"FOUND .img-left img: {img_left.attrib.get('src')}")
            else:
                print("NOT FOUND: .img-left img")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(main())
