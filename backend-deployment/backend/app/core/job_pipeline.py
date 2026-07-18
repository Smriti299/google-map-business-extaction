from typing import List
from backend.app.cleaning.cleaners import clean_business_profile
from backend.app.dedup.duplicate_remover import DuplicateRemover
from backend.app.search.manager import JobManager
from backend.app.search.models import Job
from backend.app.search.models import SearchRequest
from backend.app.search.models import JobStatus
from backend.app.core.data_store import JobDataStore
from scraper.search_engine import GoogleMapsSearchEngine
from scraper.profile_extractor import BusinessProfileExtractor


class JobPipeline:
    def __init__(
        self,
        job_manager: JobManager,
        search_engine: GoogleMapsSearchEngine,
        extractor: BusinessProfileExtractor,
        data_store: JobDataStore,
    ):
        self.job_manager = job_manager
        self.search_engine = search_engine
        self.extractor = extractor
        self.data_store = data_store
        self.duplicate_remover = DuplicateRemover()

    async def execute_job(self, job_id: str) -> List[dict]:
        job: Job | None = self.job_manager.get_job(job_id)
        if job is None:
            raise ValueError(f"Job not found: {job_id}")

        search_request: SearchRequest = job.request
        search_profiles = getattr(self.search_engine, "search_profiles", None)
        if callable(search_profiles):
            profiles = await search_profiles(
                search_request.query,
                search_request.location,
                search_request.limit,
            )
            cleaned_profiles = [clean_business_profile(profile) for profile in profiles]
            distinct_profiles = self.duplicate_remover.remove_duplicates(cleaned_profiles)
            self.data_store.store_results(job_id, distinct_profiles)
            return distinct_profiles

        urls = await self.search_engine.search(
            search_request.query,
            search_request.location,
            search_request.limit,
        )

        profiles: List[dict] = []
        for url in urls:
            profile = await self.extractor.extract(url)
            cleaned = clean_business_profile(profile)
            profiles.append(cleaned)

        distinct_profiles = self.duplicate_remover.remove_duplicates(profiles)
        self.data_store.store_results(job_id, distinct_profiles)
        return distinct_profiles
