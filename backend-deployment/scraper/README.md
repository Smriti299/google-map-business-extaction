# Scraper Module

This package implements Phase 3 and Phase 4 of the Google Maps Business Extractor project.

## Phase 3 — Google Maps Scraping Engine

- `browser_manager.py` — Playwright browser lifecycle management
- `scroll_handler.py` — infinite scroll helper and network idle waiting
- `listing_collector.py` — listing URL collection from search results
- `retry.py` — retry decorator for robust navigation and extraction
- `search_engine.py` — search execution service for Google Maps results

## Phase 4 — Business Profile Extraction

- `profile_extractor.py` — extracts business details from a Google Maps listing page using BeautifulSoup plus JSON-LD parsing

## Usage Example

```py
import asyncio
from scraper.browser_manager import BrowserManager
from scraper.search_engine import GoogleMapsSearchEngine
from scraper.profile_extractor import BusinessProfileExtractor

async def main():
    browser_manager = BrowserManager(headless=True)
    engine = GoogleMapsSearchEngine(browser_manager)
    urls = await engine.search("pizza New York", location="Manhattan", limit=10)

    extractor = BusinessProfileExtractor(browser_manager)
    profiles = []
    for url in urls[:5]:
        profile = await extractor.extract(url)
        profiles.append(profile)
    print(profiles)

asyncio.run(main())
```
