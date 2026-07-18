# Backend deployment package

This folder is a standalone backend upload package. It contains the FastAPI API,
Google Maps scraper, export code, PostgreSQL migration files, and Python runtime
dependencies. It deliberately excludes the frontend, local `.env`, virtual
environment, generated exports, local storage, tests, Redis, and Celery.

Use these host settings:

```text
Build command: pip install -r requirements.txt && python -m playwright install chromium
Start command: uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
Health check: /health
```

Set the values listed in `.env.example` in the host's secret/environment-variable
settings. Do not upload an actual `.env` file.

If using Alembic migration support, run once with the same `DATABASE_URL`:

```text
alembic upgrade head
```
