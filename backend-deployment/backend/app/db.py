from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from backend.app.config import settings


class Base(DeclarativeBase):
    pass


def get_sqlalchemy_database_url() -> str:
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required for SQLAlchemy database access.")
    if settings.database_url.startswith("postgresql://"):
        return settings.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return settings.database_url


def get_engine():
    return create_engine(get_sqlalchemy_database_url(), pool_pre_ping=True)


SessionLocal = sessionmaker(autocommit=False, autoflush=False)


def get_session_factory():
    SessionLocal.configure(bind=get_engine())
    return SessionLocal
