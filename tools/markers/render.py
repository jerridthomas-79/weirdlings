import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from heads import DESIGNS, svg
from playwright.async_api import async_playwright
async def main():
    os.makedirs('tools/markers/raw', exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':640,'height':640})
        for n in DESIGNS:
            await pg.set_content(f'<html><body style="margin:0;background:transparent">{svg(n)}</body></html>')
            await pg.locator('svg').screenshot(path=f'tools/markers/raw/{n}.png', omit_background=True)
        await b.close()
asyncio.run(main())
