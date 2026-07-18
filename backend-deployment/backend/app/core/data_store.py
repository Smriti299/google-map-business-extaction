import csv
import json
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from logger import get_logger

try:
    import psycopg
    from psycopg.types.json import Jsonb
except ImportError:
    psycopg = None
    Jsonb = None


logger = get_logger("backend.core.data_store")


def _normalize_csv_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        return str(value)


class JobDataStore(ABC):
    def __init__(self, storage_dir: str = "storage"):
        self.storage_dir = storage_dir
        self._ensure_dir(self.storage_dir)

    def _ensure_dir(self, path: str) -> None:
        os.makedirs(path, exist_ok=True)

    @abstractmethod
    def store_results(self, job_id: str, results: List[dict]) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_results(self, job_id: str) -> Optional[List[dict]]:
        raise NotImplementedError

    @abstractmethod
    def store_export(self, job_id: str, export_format: str, file_path: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_export_path(self, job_id: str, export_format: str) -> Optional[str]:
        raise NotImplementedError

    @abstractmethod
    def list_jobs(self) -> List[str]:
        raise NotImplementedError

    @abstractmethod
    def delete_job_data(self, job_id: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def update_record(self, job_id: str, record_id: str, lead_status: str | None, notes: str | None) -> Optional[dict]:
        raise NotImplementedError


class InMemoryJobDataStore(JobDataStore):
    def __init__(self, storage_dir: str = "storage"):
        super().__init__(storage_dir)
        self._results: Dict[str, List[dict]] = {}
        self._exports: Dict[str, Dict[str, str]] = {}

    def store_results(self, job_id: str, results: List[dict]) -> None:
        self._results[job_id] = results

    def get_results(self, job_id: str) -> Optional[List[dict]]:
        return self._results.get(job_id)

    def store_export(self, job_id: str, export_format: str, file_path: str) -> None:
        self._exports.setdefault(job_id, {})[export_format] = file_path

    def get_export_path(self, job_id: str, export_format: str) -> Optional[str]:
        return self._exports.get(job_id, {}).get(export_format)

    def list_jobs(self) -> List[str]:
        return list(self._results.keys())

    def delete_job_data(self, job_id: str) -> None:
        self._results.pop(job_id, None)
        self._exports.pop(job_id, None)

    def update_record(self, job_id: str, record_id: str, lead_status: str | None, notes: str | None) -> Optional[dict]:
        results = self._results.get(job_id)
        if not results:
            return None

        for record in results:
            if str(record.get("record_id")) != record_id:
                continue
            if lead_status is not None:
                record["lead_status"] = lead_status
            if notes is not None:
                record["notes"] = notes
            return record
        return None


class JsonJobDataStore(JobDataStore):
    def __init__(self, storage_dir: str = "storage"):
        super().__init__(storage_dir)
        self._results_dir = os.path.join(self.storage_dir, "results")
        self._exports_dir = os.path.join(self.storage_dir, "exports")
        self._ensure_dir(self._results_dir)
        self._ensure_dir(self._exports_dir)
        self._exports: Dict[str, Dict[str, str]] = {}

    def _result_path(self, job_id: str) -> str:
        return os.path.join(self._results_dir, f"{job_id}.json")

    def store_results(self, job_id: str, results: List[dict]) -> None:
        with open(self._result_path(job_id), "w", encoding="utf-8") as result_file:
            json.dump(results, result_file, ensure_ascii=False, indent=2)

    def get_results(self, job_id: str) -> Optional[List[dict]]:
        path = self._result_path(job_id)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as result_file:
            return json.load(result_file)

    def store_export(self, job_id: str, export_format: str, file_path: str) -> None:
        self._exports.setdefault(job_id, {})[export_format] = file_path

    def get_export_path(self, job_id: str, export_format: str) -> Optional[str]:
        return self._exports.get(job_id, {}).get(export_format)

    def list_jobs(self) -> List[str]:
        jobs = []
        for file_name in os.listdir(self._results_dir):
            if file_name.endswith(".json"):
                jobs.append(file_name.replace(".json", ""))
        return jobs

    def delete_job_data(self, job_id: str) -> None:
        result_path = self._result_path(job_id)
        if os.path.exists(result_path):
            os.remove(result_path)

        for export_path in self._exports.pop(job_id, {}).values():
            if export_path and os.path.exists(export_path):
                os.remove(export_path)

    def update_record(self, job_id: str, record_id: str, lead_status: str | None, notes: str | None) -> Optional[dict]:
        results = self.get_results(job_id)
        if not results:
            return None

        updated_record = None
        for record in results:
            if str(record.get("record_id")) != record_id:
                continue
            if lead_status is not None:
                record["lead_status"] = lead_status
            if notes is not None:
                record["notes"] = notes
            updated_record = record
            break

        if updated_record is None:
            return None

        self.store_results(job_id, results)
        return updated_record


class CsvJobDataStore(JobDataStore):
    def __init__(self, storage_dir: str = "storage"):
        super().__init__(storage_dir)
        self._results_dir = os.path.join(self.storage_dir, "results")
        self._exports_dir = os.path.join(self.storage_dir, "exports")
        self._ensure_dir(self._results_dir)
        self._ensure_dir(self._exports_dir)
        self._exports: Dict[str, Dict[str, str]] = {}

    def _result_path(self, job_id: str) -> str:
        return os.path.join(self._results_dir, f"{job_id}.csv")

    def store_results(self, job_id: str, results: List[dict]) -> None:
        if not results:
            self._ensure_dir(self._results_dir)
            with open(self._result_path(job_id), "w", encoding="utf-8", newline="") as csv_file:
                csv_file.write("")
            return

        fieldnames = sorted({key for row in results for key in row.keys()})
        with open(self._result_path(job_id), "w", encoding="utf-8", newline="") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()
            for row in results:
                writer.writerow({field: _normalize_csv_value(row.get(field)) for field in fieldnames})

    def get_results(self, job_id: str) -> Optional[List[dict]]:
        path = self._result_path(job_id)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8", newline="") as csv_file:
            reader = csv.DictReader(csv_file)
            return [dict(row) for row in reader]

    def store_export(self, job_id: str, export_format: str, file_path: str) -> None:
        self._exports.setdefault(job_id, {})[export_format] = file_path

    def get_export_path(self, job_id: str, export_format: str) -> Optional[str]:
        return self._exports.get(job_id, {}).get(export_format)

    def list_jobs(self) -> List[str]:
        jobs = []
        for file_name in os.listdir(self._results_dir):
            if file_name.endswith(".csv"):
                jobs.append(file_name.replace(".csv", ""))
        return jobs

    def delete_job_data(self, job_id: str) -> None:
        result_path = self._result_path(job_id)
        if os.path.exists(result_path):
            os.remove(result_path)

        for export_path in self._exports.pop(job_id, {}).values():
            if export_path and os.path.exists(export_path):
                os.remove(export_path)

    def update_record(self, job_id: str, record_id: str, lead_status: str | None, notes: str | None) -> Optional[dict]:
        results = self.get_results(job_id)
        if not results:
            return None

        updated_record = None
        for record in results:
            if str(record.get("record_id")) != record_id:
                continue
            if lead_status is not None:
                record["lead_status"] = lead_status
            if notes is not None:
                record["notes"] = notes
            updated_record = record
            break

        if updated_record is None:
            return None

        self.store_results(job_id, results)
        return updated_record


class PostgresJobDataStore(JobDataStore):
    _SCHEMA_STATEMENTS = (
        """
        CREATE TABLE IF NOT EXISTS job_results (
            job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
            results JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS job_exports (
            job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            export_format TEXT NOT NULL,
            file_path TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (job_id, export_format)
        )
        """,
    )

    def __init__(self, database_url: str, storage_dir: str = "storage"):
        super().__init__(storage_dir)
        self.database_url = database_url
        self._ensure_psycopg_available()
        self._ensure_schema()

    def _ensure_psycopg_available(self) -> None:
        if psycopg is None or Jsonb is None:
            raise RuntimeError(
                "PostgreSQL storage requires psycopg. Install it with: pip install 'psycopg[binary]'"
            )

    def _connect(self):
        self._ensure_psycopg_available()
        return psycopg.connect(self.database_url)

    def _ensure_schema(self) -> None:
        try:
            with self._connect() as connection:
                for statement in self._SCHEMA_STATEMENTS:
                    connection.execute(statement)
            logger.info("PostgreSQL storage schema is ready.")
        except Exception:
            logger.exception("Failed to initialize PostgreSQL storage schema.")
            raise

    def store_results(self, job_id: str, results: List[dict]) -> None:
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO job_results (job_id, results, updated_at)
                    VALUES (%s, %s, now())
                    ON CONFLICT (job_id)
                    DO UPDATE SET results = EXCLUDED.results, updated_at = now()
                    """,
                    (job_id, Jsonb(results)),
                )
            logger.info("Stored %s PostgreSQL result records for job %s.", len(results), job_id)
        except Exception:
            logger.exception("Failed to store PostgreSQL results for job %s.", job_id)
            raise

    def get_results(self, job_id: str) -> Optional[List[dict]]:
        try:
            with self._connect() as connection:
                row = connection.execute(
                    "SELECT results FROM job_results WHERE job_id = %s",
                    (job_id,),
                ).fetchone()
            if row is None:
                return None
            results = row[0]
            if isinstance(results, list):
                return results
            logger.error("PostgreSQL results for job %s are not a JSON array.", job_id)
            return None
        except Exception:
            logger.exception("Failed to fetch PostgreSQL results for job %s.", job_id)
            raise

    def store_export(self, job_id: str, export_format: str, file_path: str) -> None:
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO job_exports (job_id, export_format, file_path, updated_at)
                    VALUES (%s, %s, %s, now())
                    ON CONFLICT (job_id, export_format)
                    DO UPDATE SET file_path = EXCLUDED.file_path, updated_at = now()
                    """,
                    (job_id, export_format, file_path),
                )
            logger.info("Stored PostgreSQL export path for job %s format %s.", job_id, export_format)
        except Exception:
            logger.exception(
                "Failed to store PostgreSQL export path for job %s format %s.",
                job_id,
                export_format,
            )
            raise

    def get_export_path(self, job_id: str, export_format: str) -> Optional[str]:
        try:
            with self._connect() as connection:
                row = connection.execute(
                    """
                    SELECT file_path
                    FROM job_exports
                    WHERE job_id = %s AND export_format = %s
                    """,
                    (job_id, export_format),
                ).fetchone()
            if row is None:
                return None
            return row[0]
        except Exception:
            logger.exception(
                "Failed to fetch PostgreSQL export path for job %s format %s.",
                job_id,
                export_format,
            )
            raise

    def list_jobs(self) -> List[str]:
        try:
            with self._connect() as connection:
                rows = connection.execute(
                    "SELECT job_id FROM job_results ORDER BY updated_at DESC"
                ).fetchall()
            return [row[0] for row in rows]
        except Exception:
            logger.exception("Failed to list PostgreSQL result jobs.")
            raise

    def delete_job_data(self, job_id: str) -> None:
        try:
            with self._connect() as connection:
                connection.execute("DELETE FROM job_exports WHERE job_id = %s", (job_id,))
                connection.execute("DELETE FROM job_results WHERE job_id = %s", (job_id,))
            logger.info("Deleted PostgreSQL data for job %s.", job_id)
        except Exception:
            logger.exception("Failed to delete PostgreSQL data for job %s.", job_id)
            raise

    def update_record(self, job_id: str, record_id: str, lead_status: str | None, notes: str | None) -> Optional[dict]:
        results = self.get_results(job_id)
        if not results:
            return None

        updated_record = None
        for record in results:
            if str(record.get("record_id")) != record_id:
                continue
            if lead_status is not None:
                record["lead_status"] = lead_status
            if notes is not None:
                record["notes"] = notes
            updated_record = record
            break

        if updated_record is None:
            return None

        self.store_results(job_id, results)
        return updated_record
