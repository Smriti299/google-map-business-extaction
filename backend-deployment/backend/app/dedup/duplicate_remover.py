from typing import Any, Dict, Iterable, List, Optional


class DuplicateRemover:
    def __init__(self):
        self._seen_urls: set[str] = set()
        self._seen_phones: set[str] = set()
        self._seen_name_address: set[str] = set()

    def _normalize_phone(self, phone: Optional[str]) -> Optional[str]:
        if not phone:
            return None
        digits = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
        if digits.startswith("00"):
            digits = "+" + digits[2:]
        return digits if digits else None

    def _normalize_value(self, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        return " ".join(value.strip().lower().split())

    def _key_from_profile(self, profile: Dict[str, Any]) -> str:
        name = self._normalize_value(profile.get("name")) or ""
        address = self._normalize_value(profile.get("address")) or ""
        return f"{name}|{address}"

    def is_duplicate(self, profile: Dict[str, Any]) -> bool:
        maps_url = self._normalize_value(profile.get("maps_url"))
        if maps_url and maps_url in self._seen_urls:
            return True

        phone = self._normalize_phone(profile.get("phone"))
        if phone and phone in self._seen_phones:
            return True

        name_address = self._key_from_profile(profile)
        if name_address and name_address in self._seen_name_address:
            return True

        return False

    def add(self, profile: Dict[str, Any]) -> None:
        maps_url = self._normalize_value(profile.get("maps_url"))
        if maps_url:
            self._seen_urls.add(maps_url)

        phone = self._normalize_phone(profile.get("phone"))
        if phone:
            self._seen_phones.add(phone)

        name_address = self._key_from_profile(profile)
        if name_address:
            self._seen_name_address.add(name_address)

    def remove_duplicates(self, profiles: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
        unique_profiles: List[Dict[str, Any]] = []
        for profile in profiles:
            if self.is_duplicate(profile):
                continue
            self.add(profile)
            unique_profiles.append(profile)
        return unique_profiles
