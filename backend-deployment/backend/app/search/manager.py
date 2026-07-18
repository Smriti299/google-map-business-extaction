import threading
import uuid
import json
from typing import Dict, Optional, List
from datetime import datetime

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from backend.app.search.models import Job, SearchRequest
from backend.app.search.enums import JobStatus


class JobManager:
    """In-memory job manager with thread-safe operations."""

    def __init__(self):
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.RLock()

    def create_job(self, request: SearchRequest, user_id: str | None = None) -> Job:
        job_id = str(uuid.uuid4())
        job = Job(id=job_id, user_id=user_id, request=request, status=JobStatus.PENDING, created_at=datetime.utcnow())
        with self._lock:
            self._jobs[job_id] = job
        return job

    def set_running(self, job_id: str) -> Optional[Job]:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            job.status = JobStatus.RUNNING
            job.updated_at = datetime.utcnow()
            self._jobs[job_id] = job
            return job

    def set_completed(self, job_id: str, result_count: int = 0) -> Optional[Job]:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            job.status = JobStatus.COMPLETED
            job.result_count = result_count
            job.updated_at = datetime.utcnow()
            self._jobs[job_id] = job
            return job

    def set_failed(self, job_id: str, error: str) -> Optional[Job]:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            job.status = JobStatus.FAILED
            job.error = error
            job.updated_at = datetime.utcnow()
            self._jobs[job_id] = job
            return job

    def get_job(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def delete_job(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.pop(job_id, None)

    def list_jobs(self, user_id: str | None = None) -> List[Job]:
        with self._lock:
            jobs = list(self._jobs.values())
        if user_id is None:
            return jobs
        return [job for job in jobs if job.user_id == user_id]

    def count_running_jobs(self) -> int:
        with self._lock:
            return sum(1 for job in self._jobs.values() if job.status == JobStatus.RUNNING)


class PostgresJobManager(JobManager):
    _SCHEMA_STATEMENTS = (
        """
        CREATE TABLE IF NOT EXISTS jobs (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            request JSONB NOT NULL,
            status TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ,
            result_count INTEGER NOT NULL DEFAULT 0,
            error TEXT
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON jobs (user_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status)",
    )

    def __init__(self, database_url: str):
        self.database_url = database_url
        self._ensure_schema()

    def _connect(self):
        return psycopg.connect(self.database_url, row_factory=dict_row)

    def _ensure_schema(self) -> None:
        with self._connect() as connection:
            for statement in self._SCHEMA_STATEMENTS:
                connection.execute(statement)

    def _row_to_job(self, row: dict) -> Job:
        request_data = row["request"]
        if isinstance(request_data, str):
            request_data = json.loads(request_data)
        return Job(
            id=str(row["id"]),
            user_id=str(row["user_id"]) if row.get("user_id") else None,
            request=SearchRequest(**request_data),
            status=JobStatus(row["status"]),
            created_at=row["created_at"],
            updated_at=row.get("updated_at"),
            result_count=int(row.get("result_count") or 0),
            error=row.get("error"),
        )

    def create_job(self, request: SearchRequest, user_id: str | None = None) -> Job:
        job_id = str(uuid.uuid4())
        with self._connect() as connection:
            row = connection.execute(
                """
                INSERT INTO jobs (id, user_id, request, status)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (job_id, user_id, Jsonb(request.model_dump()), JobStatus.PENDING.value),
            ).fetchone()
        return self._row_to_job(row)

    def set_running(self, job_id: str) -> Optional[Job]:
        return self._set_status(job_id, JobStatus.RUNNING)

    def set_completed(self, job_id: str, result_count: int = 0) -> Optional[Job]:
        return self._set_status(job_id, JobStatus.COMPLETED, result_count=result_count, error=None)

    def set_failed(self, job_id: str, error: str) -> Optional[Job]:
        return self._set_status(job_id, JobStatus.FAILED, error=error)

    def _set_status(
        self,
        job_id: str,
        status: JobStatus,
        result_count: int | None = None,
        error: str | None = None,
    ) -> Optional[Job]:
        with self._connect() as connection:
            row = connection.execute(
                """
                UPDATE jobs
                SET status = %s,
                    updated_at = now(),
                    result_count = COALESCE(%s, result_count),
                    error = %s
                WHERE id = %s
                RETURNING *
                """,
                (status.value, result_count, error, job_id),
            ).fetchone()
        return self._row_to_job(row) if row else None

    def get_job(self, job_id: str) -> Optional[Job]:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM jobs WHERE id = %s", (job_id,)).fetchone()
        return self._row_to_job(row) if row else None

    def delete_job(self, job_id: str) -> Optional[Job]:
        job = self.get_job(job_id)
        if not job:
            return None
        with self._connect() as connection:
            connection.execute("DELETE FROM jobs WHERE id = %s", (job_id,))
        return job

    def list_jobs(self, user_id: str | None = None) -> List[Job]:
        with self._connect() as connection:
            if user_id is None:
                rows = connection.execute("SELECT * FROM jobs ORDER BY created_at DESC").fetchall()
            else:
                rows = connection.execute(
                    "SELECT * FROM jobs WHERE user_id = %s ORDER BY created_at DESC",
                    (user_id,),
                ).fetchall()
        return [self._row_to_job(row) for row in rows]

    def count_running_jobs(self) -> int:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT count(*) AS count FROM jobs WHERE status IN (%s, %s)",
                (JobStatus.PENDING.value, JobStatus.RUNNING.value),
            ).fetchone()
        return int(row["count"] if row else 0)
