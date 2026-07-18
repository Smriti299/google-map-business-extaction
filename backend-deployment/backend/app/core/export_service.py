import os
from typing import List
from backend.app.core.data_store import JobDataStore
from export.manager import ExportManager


class ExportService:
    def __init__(self, data_store: JobDataStore, export_dir: str = "exports"):
        self.data_store = data_store
        self.export_manager = ExportManager(export_dir=export_dir)

    def create_export(self, job_id: str, export_format: str) -> str:
        results = self.data_store.get_results(job_id)
        if results is None:
            raise ValueError(f"No results found for job {job_id}")
        file_path = self.export_manager.export(job_id, results, export_format)
        self.data_store.store_export(job_id, export_format, file_path)
        return file_path

    def get_export_path(self, job_id: str, export_format: str) -> str:
        path = self.data_store.get_export_path(job_id, export_format)
        if path is None:
            raise ValueError(f"Export not found for job {job_id} and format {export_format}")
        return path

    def delete_exports(self, job_id: str) -> None:
        for export_format in ("csv", "xlsx", "json"):
            file_path = os.path.join(self.export_manager.export_dir, f"{job_id}.{export_format}")
            if os.path.exists(file_path):
                os.remove(file_path)
