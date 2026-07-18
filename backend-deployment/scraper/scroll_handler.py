import asyncio
from playwright.async_api import Page


async def scroll_to_bottom(page: Page, max_scrolls: int = 15, delay: float = 1.2) -> None:
    previous_height = None
    for _ in range(max_scrolls):
        current_height = await page.evaluate("() => document.body.scrollHeight")
        if previous_height == current_height:
            break
        previous_height = current_height
        await page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(delay)


async def wait_for_network_idle(page: Page, timeout: int = 5000) -> None:
    await page.wait_for_load_state("networkidle", timeout=timeout)
