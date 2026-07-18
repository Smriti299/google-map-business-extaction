from datetime import datetime
from typing import Any, Optional

import psycopg
from psycopg.rows import dict_row

from backend.app.auth.security import hash_password, hash_token
from logger import get_logger

logger = get_logger("backend.auth.store")


class AuthStore:
    _SCHEMA_STATEMENTS = (
        "CREATE EXTENSION IF NOT EXISTS pgcrypto",
        """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            role TEXT DEFAULT 'user',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT now()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT now()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions (is_active, expires_at)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)",
    )

    def __init__(self, database_url: str):
        self.database_url = database_url
        self.ensure_schema()

    def _connect(self):
        return psycopg.connect(self.database_url, row_factory=dict_row)

    def ensure_schema(self) -> None:
        with self._connect() as connection:
            for statement in self._SCHEMA_STATEMENTS:
                connection.execute(statement)
        logger.info("Authentication schema is ready.")

    def seed_admin(self, email: str | None, password: str | None, full_name: str) -> None:
        if not email or not password:
            return

        with self._connect() as connection:
            existing = connection.execute("SELECT id FROM users WHERE lower(email) = lower(%s)", (email,)).fetchone()
            if existing:
                return
            connection.execute(
                """
                INSERT INTO users (email, password_hash, full_name, role)
                VALUES (%s, %s, %s, 'admin')
                """,
                (email.strip().lower(), hash_password(password), full_name),
            )
        logger.info("Seeded first admin user %s.", email)

    def get_user_by_email(self, email: str) -> Optional[dict[str, Any]]:
        with self._connect() as connection:
            return connection.execute(
                "SELECT * FROM users WHERE lower(email) = lower(%s)",
                (email,),
            ).fetchone()

    def get_user_by_id(self, user_id: str) -> Optional[dict[str, Any]]:
        with self._connect() as connection:
            return connection.execute("SELECT * FROM users WHERE id = %s", (user_id,)).fetchone()

    def count_active_sessions(self) -> int:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT count(*) AS count FROM sessions WHERE is_active = TRUE AND expires_at > now()"
            ).fetchone()
        return int(row["count"] if row else 0)

    def create_session(self, user_id: str, token: str, expires_at: datetime) -> str:
        with self._connect() as connection:
            row = connection.execute(
                """
                INSERT INTO sessions (user_id, token_hash, expires_at)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (user_id, hash_token(token), expires_at),
            ).fetchone()
        return str(row["id"])

    def update_session_token(self, session_id: str, token: str) -> None:
        with self._connect() as connection:
            connection.execute(
                "UPDATE sessions SET token_hash = %s WHERE id = %s",
                (hash_token(token), session_id),
            )

    def get_active_session(self, session_id: str, token: str) -> Optional[dict[str, Any]]:
        with self._connect() as connection:
            return connection.execute(
                """
                SELECT *
                FROM sessions
                WHERE id = %s
                  AND token_hash = %s
                  AND is_active = TRUE
                  AND expires_at > now()
                """,
                (session_id, hash_token(token)),
            ).fetchone()

    def deactivate_session(self, session_id: str) -> None:
        with self._connect() as connection:
            connection.execute("UPDATE sessions SET is_active = FALSE WHERE id = %s", (session_id,))

    def cleanup_expired_sessions(self) -> None:
        with self._connect() as connection:
            connection.execute("UPDATE sessions SET is_active = FALSE WHERE is_active = TRUE AND expires_at <= now()")
