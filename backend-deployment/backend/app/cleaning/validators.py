import re
from typing import Optional
from urllib.parse import urlparse


PHONE_PATTERN = re.compile(r"^\+?\d{7,15}$")
URL_PATTERN = re.compile(r"^(https?://).+")


def validate_phone(phone: Optional[str]) -> bool:
    if not phone:
        return False
    normalized = re.sub(r"[^0-9+]", "", phone)
    return bool(PHONE_PATTERN.match(normalized))


def validate_website(url: Optional[str]) -> bool:
    if not url:
        return False
    normalized = url.strip()
    if not normalized:
        return False
    if not normalized.startswith(("http://", "https://")):
        normalized = f"http://{normalized}"
    parsed = urlparse(normalized)
    return bool(parsed.scheme in {"http", "https"} and parsed.netloc)


def validate_rating(rating: Optional[float]) -> bool:
    if rating is None:
        return False
    try:
        value = float(rating)
    except (ValueError, TypeError):
        return False
    return 0.0 <= value <= 5.0


def validate_review_count(review_count: Optional[int]) -> bool:
    if review_count is None:
        return False
    try:
        value = int(review_count)
    except (ValueError, TypeError):
        return False
    return value >= 0
