
import asyncio
from playwright.async_api import async_playwright
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        async def log_response(response):
            if "incehesap.com" in response.url and ("api" in response.url or "json" in response.url or response.request.resource_type == "fetch" or response.request.resource_type == "xhr"):
                print(f"API CALL: {response.url}")
                try:
                    text = await response.text()
                    if "anakart" in text.lower() or "kasa" in text.lower():
                        print(f"FOUND COMPONENT DATA IN {response.url}")
                        with open("scratch/api_response.json", "w", encoding="utf-8") as f:
                            f.write(text)
                except: pass
                
        page.on("response", log_response)
        
        print("Navigating...")
        await page.goto("https://www.incehesap.com/ferzex-gold-oem-paket-fiyati-50710/")
        await page.wait_for_timeout(5000)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
