from pydantic_settings import BaseSettings


from typing import Optional

class Settings(BaseSettings):
    app_name: str = "gmb-extractor"
    env: str = "development"
    port: int = 8000
    headless: bool = True
    export_path: str = "exports"
    storage_mode: str = "memory"  # options: memory, json_file, csv_file, postgres
    storage_dir: str = "storage"
    database_url: Optional[str] = None
    google_maps_api_enabled: bool = False
    google_maps_api_permission_granted: bool = False
    google_maps_api_key: Optional[str] = None
    serpapi_enabled: bool = False
    serpapi_api_key: Optional[str] = None
    playwright_browsers_path: str | None = None
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    auth_cookie_name: str = "gmb_session"
    csrf_cookie_name: str = "gmb_csrf"
    max_active_users: int = 10
    max_concurrent_jobs: int = 5
    first_admin_email: Optional[str] = None
    first_admin_password: Optional[str] = None
    first_admin_full_name: str = "Admin"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: Optional[str] = None
    celery_result_backend: Optional[str] = None

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()
