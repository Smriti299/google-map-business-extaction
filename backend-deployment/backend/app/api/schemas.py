from typing import Optional
from pydantic import BaseModel, Field, field_validator
from backend.app.search.models import Job

ALLOWED_RECORD_STATUSES = {"new", "contacted", "follow_up", "qualified", "rejected"}


class StartJobRequest(BaseModel):
    query: str
    location: Optional[str] = None
    limit: int = 50


class ExportResponse(BaseModel):
    job_id: str
    format: str
    file_name: str


class JobListResponse(BaseModel):
    jobs: list[Job]


class RecordUpdateRequest(BaseModel):
    lead_status: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("lead_status")
    @classmethod
    def validate_lead_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalized = value.strip().lower()
        if normalized not in ALLOWED_RECORD_STATUSES:
            raise ValueError("Invalid lead status.")
        return normalized


class RecordUpdateResponse(BaseModel):
    record_id: str
    lead_status: str
    notes: str
