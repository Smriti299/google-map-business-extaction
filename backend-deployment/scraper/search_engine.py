import asyncio
import re
import urllib.parse
from typing import List, Optional
from playwright.async_api import BrowserContext, Page

import requests
from requests.adapters import HTTPAdapter
from requests.exceptions import RequestException
from scraper.browser_manager import BrowserManager
from scraper.listing_collector import collect_listing_urls
from scraper.retry import retry_async
from scraper.scroll_handler import scroll_to_bottom, wait_for_network_idle
from urllib3.util.retry import Retry


def _build_retrying_session() -> requests.Session:
    retry_strategy = Retry(
        total=3,
        connect=3,
        read=3,
        status=3,
        backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def _get_json_with_retries(url: str, params: dict, provider_name: str) -> dict:
    try:
        with _build_retrying_session() as session:
            response = session.get(
                url,
                params=params,
                timeout=(10, 45),
                headers={"User-Agent": "gmb-extractor/1.0"},
            )
            response.raise_for_status()
            return response.json()
    except ValueError as exc:
        raise RuntimeError(f"{provider_name} returned an invalid JSON response.") from exc
    except RequestException as exc:
        raise RuntimeError(
            f"{provider_name} request failed after retries. Check your internet connection, API key, and provider status. "
            f"Details: {exc.__class__.__name__}"
        ) from exc


class GoogleMapsSearchEngine:
    BASE_URL = "https://www.google.com/maps/search"

    def __init__(self, browser_manager: BrowserManager, headless: bool = True):
        self.browser_manager = browser_manager
        self.headless = headless

    def _build_search_url(self, query: str, location: Optional[str] = None) -> str:
        search_terms = self._build_search_terms(query, location)
        encoded = urllib.parse.quote_plus(search_terms)
        return f"{self.BASE_URL}/{encoded}"

    def _build_search_terms(self, query: str, location: Optional[str] = None) -> str:
        search_terms = query.strip()
        if not location:
            return search_terms

        location_hint = location.strip()
        normalized_query = search_terms.casefold()
        normalized_location = location_hint.casefold()
        if normalized_location in normalized_query:
            return search_terms

        if re.search(r"\b(in|near|around|within)\b", normalized_query):
            return f"{search_terms} {location_hint}"

        return f"{search_terms} in {location_hint}"

    @retry_async(attempts=3, delay_seconds=2.0)
    async def _navigate(self, page: Page, url: str) -> None:
        await page.goto(url, timeout=30000)
        await wait_for_network_idle(page, timeout=30000)

    async def search(self, query: str, location: Optional[str] = None, limit: int = 50) -> List[str]:
        async with self.browser_manager as manager:
            context: BrowserContext = await manager.new_context()
            page: Page = await manager.new_page(context)
            url = self._build_search_url(query, location)
            await self._navigate(page, url)
            await scroll_to_bottom(page, max_scrolls=12, delay=1.5)
            urls = await collect_listing_urls(page, limit=limit)
            return urls


class GoogleMapsApiSearchEngine(GoogleMapsSearchEngine):
    API_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"

    def __init__(
        self,
        browser_manager: BrowserManager,
        api_key: str,
        permission_granted: bool,
        headless: bool = True,
    ):
        super().__init__(browser_manager, headless=headless)
        self.api_key = api_key
        self.permission_granted = permission_granted

    async def search(self, query: str, location: Optional[str] = None, limit: int = 50) -> List[str]:
        if not self.permission_granted:
            raise RuntimeError("Google Maps API permission has not been granted.")
        if not self.api_key:
            raise RuntimeError("Google Maps API key is required for API mode.")

        return await asyncio.to_thread(self._fetch_search_results, query, location, limit)

    def _fetch_search_results(self, query: str, location: Optional[str], limit: int) -> List[str]:
        search_terms = self._build_search_terms(query, location)

        payload = _get_json_with_retries(
            self.API_URL,
            params={"query": search_terms, "key": self.api_key},
            provider_name="Google Maps Places API",
        )

        if payload.get("status") != "OK":
            error_message = payload.get("error_message", "Unknown error")
            raise RuntimeError(f"Google Maps Places API error: {payload.get('status')} - {error_message}")

        urls: List[str] = []
        for place in payload.get("results", [])[:limit]:
            place_id = place.get("place_id")
            if place_id:
                urls.append(f"https://www.google.com/maps/place/?q=place_id:{place_id}")
        return urls


class SerpApiSearchEngine(GoogleMapsSearchEngine):
    API_URL = "https://serpapi.com/search"

    def __init__(
        self,
        browser_manager: BrowserManager,
        api_key: str,
        permission_granted: bool,
        headless: bool = True,
    ):
        super().__init__(browser_manager, headless=headless)
        self.api_key = api_key
        self.permission_granted = permission_granted

    async def search(self, query: str, location: Optional[str] = None, limit: int = 50) -> List[str]:
        if not self.permission_granted:
            raise RuntimeError("SerpApi permission has not been granted.")
        if not self.api_key:
            raise RuntimeError("SerpApi API key is required for API mode.")

        return await asyncio.to_thread(self._fetch_search_results, query, location, limit)

    def _extract_url(self, item: dict) -> Optional[str]:
        link = item.get("link") or item.get("maps_link") or item.get("url")
        if link:
            return link
        place_id = item.get("place_id")
        if place_id:
            return f"https://www.google.com/maps/place/?q=place_id:{place_id}"
        for value in item.values():
            if isinstance(value, dict):
                nested = self._extract_url(value)
                if nested:
                    return nested
        return None

    def _location_tokens(self, location: Optional[str]) -> List[str]:
        if not location:
            return []
        return [token.strip().casefold() for token in location.split(",") if token.strip()]

    def _matches_location(self, item: dict, location: Optional[str]) -> bool:
        tokens = self._location_tokens(location)
        if not tokens:
            return True

        address = item.get("address")
        segments = [segment.strip().casefold() for segment in address.split(",")] if isinstance(address, str) else []
        searchable_segments = [segment for segment in segments[1:] if segment] or segments
        country = item.get("country")
        if isinstance(country, str) and country.strip():
            searchable_segments.append(country.strip().casefold())

        if not searchable_segments:
            return True

        return all(any(token in segment for segment in searchable_segments) for token in tokens)

    def _fetch_search_results(self, query: str, location: Optional[str], limit: int) -> List[str]:
        profiles = self._fetch_search_profiles(query, location, limit)
        urls = [profile["maps_url"] for profile in profiles if profile.get("maps_url")]
        if not urls:
            raise RuntimeError("SerpApi returned no map URLs for the search query.")
        return urls

    async def search_profiles(self, query: str, location: Optional[str] = None, limit: int = 50) -> List[dict]:
        if not self.permission_granted:
            raise RuntimeError("SerpApi permission has not been granted.")
        if not self.api_key:
            raise RuntimeError("SerpApi API key is required for API mode.")

        return await asyncio.to_thread(self._fetch_search_profiles, query, location, limit)

    def _fetch_search_profiles(self, query: str, location: Optional[str], limit: int) -> List[dict]:
        search_terms = self._build_search_terms(query, location)

        payload = _get_json_with_retries(
            self.API_URL,
            params={
                "engine": "google_maps",
                "q": search_terms,
                "api_key": self.api_key,
                "num": limit,
            },
            provider_name="SerpApi",
        )

        if payload.get("error"):
            raise RuntimeError(f"SerpApi error: {payload.get('error')} - {payload.get('error_message', 'No details')}")

        local_results = [item for item in payload.get("local_results", [])[:limit] if isinstance(item, dict)]
        matched_local_results = [item for item in local_results if self._matches_location(item, location)]
        if matched_local_results:
            local_results = matched_local_results

        profiles: List[dict] = []
        for item in local_results:
            if not isinstance(item, dict):
                continue

            coordinates = item.get("gps_coordinates") if isinstance(item.get("gps_coordinates"), dict) else {}
            profiles.append(
                {
                    "name": item.get("title"),
                    "category": item.get("type"),
                    "address": item.get("address"),
                    "phone": item.get("phone"),
                    "website": item.get("website"),
                    "rating": item.get("rating"),
                    "reviews": item.get("reviews"),
                    "maps_url": self._extract_url(item),
                    "latitude": coordinates.get("latitude"),
                    "longitude": coordinates.get("longitude"),
                }
            )

        if profiles:
            return profiles

        urls: List[str] = []
        for section in ("places_results", "organic_results", "search_results", "results"):
            for item in payload.get(section, [])[:limit]:
                if not isinstance(item, dict):
                    continue
                url = self._extract_url(item)
                if not url:
                    continue
                urls.append(
                    {
                        "name": item.get("title") or item.get("name"),
                        "category": item.get("type"),
                        "address": item.get("address"),
                        "phone": item.get("phone"),
                        "website": item.get("website"),
                        "rating": item.get("rating"),
                        "reviews": item.get("reviews"),
                        "maps_url": url,
                        "latitude": None,
                        "longitude": None,
                    }
                )
                if len(urls) >= limit:
                    return urls

        raise RuntimeError("SerpApi returned no business profiles for the search query.")
