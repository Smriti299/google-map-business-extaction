import json
import re
from typing import Optional
from bs4 import BeautifulSoup
from playwright.async_api import BrowserContext, Page

from scraper.browser_manager import BrowserManager
from scraper.retry import retry_async
from scraper.scroll_handler import wait_for_network_idle


def _extract_from_json_ld(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    script = soup.find("script", type="application/ld+json")
    if not script or not script.string:
        return {}
    try:
        data = json.loads(script.string)
    except json.JSONDecodeError:
        return {}
    if isinstance(data, list):
        for item in data:
            if item.get("@type") == "LocalBusiness":
                return item
        return data[0] if data else {}
    return data if data.get("@type") in {"LocalBusiness", "Organization", "Place"} else {}


def _parse_coordinates(url: str) -> tuple[Optional[float], Optional[float]]:
    match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url)
    if match:
        return float(match.group(1)), float(match.group(2))
    return None, None


def _normalize_text(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return " ".join(value.strip().split())


class BusinessProfileExtractor:
    def __init__(self, browser_manager: BrowserManager):
        self.browser_manager = browser_manager

    @retry_async(attempts=3, delay_seconds=2.0)
    async def extract(self, maps_url: str) -> dict:
        async with self.browser_manager as manager:
            context: BrowserContext = await manager.new_context()
            page: Page = await manager.new_page(context)
            await page.goto(maps_url, timeout=30000)
            await wait_for_network_idle(page, timeout=30000)
            html = await page.content()

        data = _extract_from_json_ld(html)
        name = _normalize_text(data.get("name") if isinstance(data, dict) else None)
        category = None
        address = None
        phone = None
        website = None
        rating = None
        reviews = None
        latitude = None
        longitude = None

        if data:
            category = _normalize_text(data.get("@type") if isinstance(data.get("@type"), str) else None)
            address_value = data.get("address")
            if isinstance(address_value, dict):
                address = _normalize_text(
                    ", ".join(filter(None, [address_value.get("streetAddress"), address_value.get("addressLocality"), address_value.get("addressRegion"), address_value.get("postalCode"), address_value.get("addressCountry")]))
                )
            else:
                address = _normalize_text(address_value)
            phone = _normalize_text(data.get("telephone"))
            website = _normalize_text(data.get("url"))
            aggregate_rating = data.get("aggregateRating") if isinstance(data.get("aggregateRating"), dict) else {}
            rating = aggregate_rating.get("ratingValue")
            reviews = aggregate_rating.get("reviewCount")
            geo = data.get("geo") if isinstance(data.get("geo"), dict) else {}
            latitude = geo.get("latitude")
            longitude = geo.get("longitude")

        if not latitude or not longitude:
            latitude, longitude = _parse_coordinates(maps_url)

        return {
            "name": name,
            "category": category,
            "address": address,
            "phone": phone,
            "website": website,
            "rating": rating,
            "reviews": reviews,
            "maps_url": maps_url,
            "latitude": latitude,
            "longitude": longitude,
        }
