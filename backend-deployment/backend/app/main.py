from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.config import settings
from backend.app.auth.router import router as auth_router
from backend.app.auth.store import AuthStore
from backend.app.search.manager import JobManager, PostgresJobManager
from backend.app.search.service import SearchService
from backend.app.api import router, RequestLoggingMiddleware
from backend.app.api.exceptions import (
    job_not_found_exception_handler,
    export_not_found_exception_handler,
    generic_http_exception_handler,
    JobNotFoundException,
    ExportNotFoundException,
)
from backend.app.core.data_store import (
    CsvJobDataStore,
    InMemoryJobDataStore,
    JsonJobDataStore,
    JobDataStore,
    PostgresJobDataStore,
)
from backend.app.core.export_service import ExportService
from backend.app.core.job_pipeline import JobPipeline
from scraper.browser_manager import BrowserManager
from scraper.search_engine import GoogleMapsApiSearchEngine, GoogleMapsSearchEngine, SerpApiSearchEngine
from scraper.profile_extractor import BusinessProfileExtractor


def create_app() -> FastAPI:
    app = FastAPI(title="Google Maps Business Extractor API")

    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://smriti299-google-map-business.vercel.app"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(HTTPException, generic_http_exception_handler)
    app.add_exception_handler(JobNotFoundException, job_not_found_exception_handler)
    app.add_exception_handler(ExportNotFoundException, export_not_found_exception_handler)

    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required for authentication.")
    auth_store = AuthStore(settings.database_url)
    auth_store.seed_admin(settings.first_admin_email, settings.first_admin_password, settings.first_admin_full_name)

    job_manager = PostgresJobManager(settings.database_url) if settings.storage_mode == "postgres" else JobManager()
    search_service = SearchService(job_manager)

    if settings.storage_mode == "memory":
        data_store: JobDataStore = InMemoryJobDataStore(settings.storage_dir)
    elif settings.storage_mode == "json_file":
        data_store = JsonJobDataStore(settings.storage_dir)
    elif settings.storage_mode == "csv_file":
        data_store = CsvJobDataStore(settings.storage_dir)
    elif settings.storage_mode == "postgres":
        if not settings.database_url:
            raise RuntimeError("DATABASE_URL is required when STORAGE_MODE=postgres.")
        data_store = PostgresJobDataStore(settings.database_url, settings.storage_dir)
    else:
        raise ValueError(
            f"Unsupported STORAGE_MODE '{settings.storage_mode}'. Use 'memory', 'json_file', 'csv_file', or 'postgres'."
        )

    export_service = ExportService(data_store, export_dir=settings.export_path)
    browser_manager = BrowserManager(headless=settings.headless)

    if settings.serpapi_enabled:
        if not settings.serpapi_api_key:
            raise RuntimeError("SerpApi integration requires SERPAPI_API_KEY.")
        search_engine = SerpApiSearchEngine(
            browser_manager,
            api_key=settings.serpapi_api_key,
            permission_granted=settings.serpapi_enabled,
            headless=settings.headless,
        )
    elif settings.google_maps_api_enabled:
        if not settings.google_maps_api_permission_granted:
            raise RuntimeError(
                "Google Maps API integration is enabled but permission has not been granted. "
                "Set GOOGLE_MAPS_API_PERMISSION_GRANTED=true only after approval."
            )
        if not settings.google_maps_api_key:
            raise RuntimeError("Google Maps API integration requires GOOGLE_MAPS_API_KEY.")
        search_engine = GoogleMapsApiSearchEngine(
            browser_manager,
            api_key=settings.google_maps_api_key,
            permission_granted=settings.google_maps_api_permission_granted,
            headless=settings.headless,
        )
    else:
        search_engine = GoogleMapsSearchEngine(browser_manager)

    extractor = BusinessProfileExtractor(browser_manager)
    job_pipeline = JobPipeline(job_manager, search_engine, extractor, data_store)
    search_service.register_executor(job_pipeline.execute_job)

    app.state.job_manager = job_manager
    app.state.search_service = search_service
    app.state.data_store = data_store
    app.state.export_service = export_service
    app.state.job_pipeline = job_pipeline
    app.state.auth_store = auth_store
    app.state.settings = settings

    app.include_router(auth_router, prefix="/api")
    app.include_router(router, prefix="/api")

    static_dir = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="frontend")

    @app.get("/")
    async def root():
        search_mode = (
            "serpapi"
            if settings.serpapi_enabled
            else "google_maps"
            if settings.google_maps_api_enabled
            else "browser"
        )
        return {
            "message": f"{settings.app_name} - Phase 11 Ready",
            "env": settings.env,
            "search_mode": search_mode,
        }

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "env": settings.env}

    return app


app = create_app()
