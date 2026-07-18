from pydantic import BaseModel, Field, AnyHttpUrl
from typing import Optional, List
from datetime import datetime
from backend.app.search.enums import JobStatus


class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query, e.g., 'pizza New York'")
    location: Optional[str] = Field(None, description="Optional location hint")
    limit: int = Field(50, ge=1, le=1000)


class Job(BaseModel):
    id: str
    user_id: Optional[str] = None
    request: SearchRequest
    status: JobStatus = JobStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    result_count: int = 0
    error: Optional[str] = None


class JobList(BaseModel):
    jobs: List[Job] = []
