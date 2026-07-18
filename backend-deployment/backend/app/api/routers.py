import os
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import FileResponse
from starlette import status
from backend.app.auth.dependencies import AuthenticatedUser, get_current_user, require_csrf
from backend.app.search.models import Job, SearchRequest
from backend.app.api.exceptions import JobNotFoundException, ExportNotFoundException
from backend.app.cleaning.cleaners import clean_business_profile
from backend.app.api.schemas import (
    StartJobRequest,
    ExportResponse,
    JobListResponse,
    RecordUpdateRequest,
    RecordUpdateResponse,
)

router = APIRouter()


def _assert_job_owner(job: Job, current_user: AuthenticatedUser) -> None:
    if job.user_id and job.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this job.")


def _validate_export_format(format: str) -> str:
    normalized = format.lower()
    if normalized not in {"csv", "xlsx", "json"}:
        raise HTTPException(status_code=400, detail="Invalid export format. Use csv, xlsx, or json.")
    return normalized


@router.post("/start-job", response_model=Job)
async def start_job(
    request: StartJobRequest,
    fastapi_request: Request,
    current_user: AuthenticatedUser = Depends(require_csrf),
):
    app = fastapi_request.app
    search_service = app.state.search_service
    if app.state.job_manager.count_running_jobs() >= app.state.settings.max_concurrent_jobs:
        raise HTTPException(status_code=429, detail="System is busy. Please try again later.")
    job_id = search_service.submit(SearchRequest(**request.model_dump()), user_id=current_user.id)
    search_service.start_background_job(job_id)
    job = app.state.job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=500, detail="Failed to create job")
    return job


@router.get("/job/{job_id}", response_model=Job)
async def get_job(
    job_id: str,
    fastapi_request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    job = fastapi_request.app.state.job_manager.get_job(job_id)
    if not job:
        raise JobNotFoundException(job_id)
    _assert_job_owner(job, current_user)
    return job


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    fastapi_request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    jobs = fastapi_request.app.state.job_manager.list_jobs(user_id=current_user.id)
    return JobListResponse(jobs=jobs)


@router.delete("/job/{job_id}", status_code=204)
async def delete_job(
    job_id: str,
    fastapi_request: Request,
    current_user: AuthenticatedUser = Depends(require_csrf),
):
    app = fastapi_request.app
    job = app.state.job_manager.get_job(job_id)
    if not job:
        raise JobNotFoundException(job_id)
    _assert_job_owner(job, current_user)

    app.state.job_manager.delete_job(job_id)
    app.state.data_store.delete_job_data(job_id)
    app.state.export_service.delete_exports(job_id)


@router.get("/job/{job_id}/results")
async def get_job_results(
    job_id: str,
    fastapi_request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    app = fastapi_request.app
    job = app.state.job_manager.get_job(job_id)
    if not job:
        raise JobNotFoundException(job_id)
    _assert_job_owner(job, current_user)

    results = app.state.data_store.get_results(job_id)
    if results is None:
        return []
    normalized_results = [
        clean_business_profile(result) if (
            result.get("record_id") is None
            or result.get("lead_status") is None
            or result.get("notes") is None
        ) else result
        for result in results
    ]
    if normalized_results != results:
        app.state.data_store.store_results(job_id, normalized_results)
    return normalized_results


@router.patch("/job/{job_id}/records/{record_id}", response_model=RecordUpdateResponse)
async def update_record(
    job_id: str,
    record_id: str,
    request: RecordUpdateRequest,
    fastapi_request: Request,
    current_user: AuthenticatedUser = Depends(require_csrf),
):
    app = fastapi_request.app
    job = app.state.job_manager.get_job(job_id)
    if not job:
        raise JobNotFoundException(job_id)
    _assert_job_owner(job, current_user)

    updated_record = app.state.data_store.update_record(
        job_id,
        record_id,
        request.lead_status,
        request.notes,
    )
    if updated_record is None:
        raise HTTPException(status_code=404, detail="Record not found.")

    return RecordUpdateResponse(
        record_id=str(updated_record.get("record_id")),
        lead_status=str(updated_record.get("lead_status") or "new"),
        notes=str(updated_record.get("notes") or ""),
    )


@router.get("/export/{job_id}", response_model=ExportResponse)
async def get_export(
    fastapi_request: Request,
    job_id: str,
    format: str = Query("csv"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    app = fastapi_request.app
    export_service = app.state.export_service
    job = app.state.job_manager.get_job(job_id)
    if not job:
        raise JobNotFoundException(job_id)
    _assert_job_owner(job, current_user)

    export_format = _validate_export_format(format)
    try:
        file_path = export_service.create_export(job_id, export_format)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if not os.path.exists(file_path):
        raise ExportNotFoundException(job_id, export_format)

    return ExportResponse(job_id=job_id, format=export_format, file_name=os.path.basename(file_path))


@router.get("/export/{job_id}/download")
async def download_export(
    fastapi_request: Request,
    job_id: str,
    format: str = Query("csv"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    app = fastapi_request.app
    job = app.state.job_manager.get_job(job_id)
    if not job:
        raise JobNotFoundException(job_id)
    _assert_job_owner(job, current_user)
    export_service = app.state.export_service
    export_format = _validate_export_format(format)
    try:
        file_path = export_service.get_export_path(job_id, export_format)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(file_path, media_type="application/octet-stream", filename=os.path.basename(file_path))
