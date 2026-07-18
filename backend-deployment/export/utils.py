import os
from pathlib import Path


def ensure_export_directory(path: str) -> str:
    export_dir = Path(path)
    export_dir.mkdir(parents=True, exist_ok=True)
    return str(export_dir.resolve())


def build_export_path(export_dir: str, job_id: str, format: str) -> str:
    ext = format.lower()
    if ext not in {"csv", "xlsx", "json"}:
        raise ValueError("Unsupported export format")
    return os.path.join(export_dir, f"{job_id}.{ext}")
