from typing import Iterable, Mapping
from export.csv_exporter import export_to_csv
from export.excel_exporter import export_to_excel
from export.json_exporter import export_to_json
from export.utils import ensure_export_directory, build_export_path


class ExportManager:
    def __init__(self, export_dir: str = "exports"):
        self.export_dir = ensure_export_directory(export_dir)

    def export(self, job_id: str, data: Iterable[Mapping], export_format: str) -> str:
        self.export_dir = ensure_export_directory(self.export_dir)
        file_path = build_export_path(self.export_dir, job_id, export_format)
        if export_format == "csv":
            return export_to_csv(data, file_path)
        if export_format == "xlsx":
            return export_to_excel(data, file_path)
        if export_format == "json":
            return export_to_json(data, file_path)
        raise ValueError(f"Unsupported export format: {export_format}")
