import json
from typing import Iterable, Mapping


def export_to_json(data: Iterable[Mapping], file_path: str) -> str:
    with open(file_path, "w", encoding="utf-8") as handle:
        json.dump(list(data), handle, indent=2, ensure_ascii=False)
    return file_path
