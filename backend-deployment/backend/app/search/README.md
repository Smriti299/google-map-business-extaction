# Search Management Module

This module implements the in-memory job management and search request models.

Components:

- `enums.py` — `JobStatus` enum
- `models.py` — `SearchRequest`, `Job`, `JobList` models
- `manager.py` — `JobManager` in-memory, thread-safe manager
- `service.py` — `SearchService` to submit jobs and run an async executor
- `validators.py` — Basic request validation helpers

Usage (example):

```py
from backend.app.search.manager import JobManager
from backend.app.search.service import SearchService
from backend.app.search.models import SearchRequest

manager = JobManager()
svc = SearchService(manager)

req = SearchRequest(query='pizza New York', limit=50)
job_id = svc.submit(req)

# Later, register an async executor that performs scraping and returns results
async def executor(job_id: str):
    # perform scraping; return either list of results or count
    return []

svc.register_executor(executor)
svc.start_background_job(job_id)
```
