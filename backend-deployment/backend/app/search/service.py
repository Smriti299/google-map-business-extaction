import asyncio
import traceback
from typing import Callable, Optional, Any

from backend.app.search.manager import JobManager
from backend.app.search.models import SearchRequest
from logger import get_logger

logger = get_logger("backend.search.service")


class SearchService:
    """Service responsible for managing search jobs lifecycle.

    The service delegates actual execution to an async executor function passed
    into `run_job_executor`. This allows the scraping engine (Phase 3) to be
    injected later without changing the manager.
    """

    def __init__(self, manager: JobManager):
        self.manager = manager
        self._executor: Optional[Callable[[str], Any]] = None

    def submit(self, request: SearchRequest, user_id: str | None = None) -> str:
        job = self.manager.create_job(request, user_id=user_id)
        return job.id

    def register_executor(self, executor: Callable[[str], Any]) -> None:
        """Register an async executor function that receives `job_id`.

        The executor should be an async callable accepting the job id and
        performing the scraping work, then calling back into the manager to
        mark completion or failure.
        """
        self._executor = executor

    def start_background_job(self, job_id: str) -> None:
        if not self._executor:
            raise RuntimeError("No executor registered for job execution")

        # Schedule the executor as an asyncio task so the API can return immediately.
        loop = asyncio.get_event_loop()
        loop.create_task(self._run_executor(job_id))

    async def _run_executor(self, job_id: str) -> None:
        try:
            logger.info("Starting job executor for %s", job_id)
            self.manager.set_running(job_id)
            result = await self._executor(job_id)
            # Executor should return result_count or similar
            count = 0
            if isinstance(result, int):
                count = result
            elif isinstance(result, (list, tuple)):
                count = len(result)
            self.manager.set_completed(job_id, result_count=count)
            logger.info("Job %s completed with %s results", job_id, count)
        except Exception as exc:
            error_message = str(exc)
            logger.error("Job %s failed: %s", job_id, error_message)
            logger.error(traceback.format_exc())
            self.manager.set_failed(job_id, error=error_message)
