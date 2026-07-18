from typing import List
from playwright.async_api import Page


async def collect_listing_urls(page: Page, limit: int = 50) -> List[str]:
    listings: List[str] = []
    # Google Maps search result links often contain '/place/' and are inside anchor tags.
    anchors = await page.query_selector_all('a[href*="/place/"]')
    for anchor in anchors:
        href = await anchor.get_attribute("href")
        if href and href.startswith("/"):
            url = f"https://www.google.com{href.split('&')[0]}"
        elif href:
            url = href.split('&')[0]
        else:
            continue
        if url not in listings:
            listings.append(url)
        if len(listings) >= limit:
            break
    return listings
