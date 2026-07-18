from typing import Any
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse


class JobNotFoundException(Exception):
    def __init__(self, job_id: str):
        self.job_id = job_id


class ExportNotFoundException(Exception):
    def __init__(self, job_id: str, export_format: str):
        self.job_id = job_id
        self.export_format = export_format


async def job_not_found_exception_handler(request: Request, exc: Any):
    return JSONResponse(
        status_code=404,
        content={"detail": f"Job not found: {exc.job_id}"},
    )


async def export_not_found_exception_handler(request: Request, exc: Any):
    return JSONResponse(
        status_code=404,
        content={"detail": f"Export not found for job {exc.job_id} format {exc.export_format}"},
    )


async def generic_http_exception_handler(request: Request, exc: Any):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
