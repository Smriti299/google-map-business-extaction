import re
from typing import Optional
from urllib.parse import urlparse, urlunparse


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    digits = re.sub(r"[^0-9+]", "", phone)
    if digits.startswith("00"):
        digits = "+" + digits[2:]
    if digits.startswith("+"):
        return digits
    if len(digits) >= 7:
        return f"+{digits}"
    return None


def normalize_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    value = url.strip()
    if not value:
        return None
    if not value.startswith(("http://", "https://")):
        value = f"https://{value}"
    parsed = urlparse(value)
    if not parsed.netloc:
        return None
    normalized = parsed._replace(path=parsed.path.rstrip("/"))
    return urlunparse(normalized)


def clean_text(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = " ".join(value.strip().split())
    return cleaned if cleaned else None
