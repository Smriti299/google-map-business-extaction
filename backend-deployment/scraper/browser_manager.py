from typing import Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page


class BrowserManager:
    def __init__(self, headless: bool = True, timeout: int = 30000, browser_type: str = "chromium"):
        self.headless = headless
        self.timeout = timeout
        self.browser_type = browser_type
        self._playwright = None
        self._browser: Optional[Browser] = None

    async def __aenter__(self):
        self._playwright = await async_playwright().start()
        self._browser = await getattr(self._playwright, self.browser_type).launch(headless=self.headless)
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def new_context(self, user_agent: Optional[str] = None) -> BrowserContext:
        if self._browser is None:
            raise RuntimeError("Browser is not started. Use `async with BrowserManager(...)`.")
        context_args = {"viewport": {"width": 1280, "height": 900}, "locale": "en-US"}
        if user_agent:
            context_args["user_agent"] = user_agent
        return await self._browser.new_context(**context_args)

    async def new_page(self, context: BrowserContext) -> Page:
        return await context.new_page()
