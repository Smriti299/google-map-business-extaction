import hashlib
from typing import Dict, Any, Optional
from backend.app.cleaning.normalizers import clean_text, normalize_phone, normalize_url
from backend.app.cleaning.validators import (
    validate_phone,
    validate_website,
    validate_rating,
    validate_review_count,
)


def _build_record_id(profile: Dict[str, Any]) -> str:
    source = "|".join(
        [
            clean_text(profile.get("maps_url")) or "",
            clean_text(profile.get("name")) or "",
            clean_text(profile.get("address")) or "",
        ]
    )
    digest = hashlib.sha1(source.encode("utf-8")).hexdigest()
    return digest[:16]


def clean_business_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
    cleaned: Dict[str, Optional[Any]] = {}

    cleaned["name"] = clean_text(profile.get("name"))
    cleaned["category"] = clean_text(profile.get("category"))
    cleaned["address"] = clean_text(profile.get("address"))

    phone = clean_text(profile.get("phone"))
    cleaned_phone = normalize_phone(phone)
    cleaned["phone"] = cleaned_phone if validate_phone(cleaned_phone) else None

    website = clean_text(profile.get("website"))
    cleaned_website = normalize_url(website)
    cleaned["website"] = cleaned_website if validate_website(cleaned_website) else None

    rating = profile.get("rating")
    cleaned_rating = None
    try:
        cleaned_rating = float(rating) if rating is not None else None
    except (TypeError, ValueError):
        cleaned_rating = None
    cleaned["rating"] = cleaned_rating if validate_rating(cleaned_rating) else None

    review_count = profile.get("reviews")
    cleaned_reviews = None
    try:
        cleaned_reviews = int(review_count) if review_count is not None else None
    except (TypeError, ValueError):
        cleaned_reviews = None
    cleaned["reviews"] = cleaned_reviews if validate_review_count(cleaned_reviews) else None

    cleaned["maps_url"] = normalize_url(profile.get("maps_url"))
    cleaned["latitude"] = profile.get("latitude")
    cleaned["longitude"] = profile.get("longitude")
    cleaned["record_id"] = clean_text(profile.get("record_id")) or _build_record_id(cleaned)
    cleaned["lead_status"] = clean_text(profile.get("lead_status")) or "new"
    cleaned["notes"] = clean_text(profile.get("notes")) or ""

    return cleaned
