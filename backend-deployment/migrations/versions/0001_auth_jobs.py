"""auth users sessions and jobs

Revision ID: 0001_auth_jobs
Revises:
Create Date: 2026-06-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_auth_jobs"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text()),
        sa.Column("role", sa.Text(), server_default="user"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_sessions_active", "sessions", ["is_active", "expires_at"])
    op.create_index("idx_sessions_user_id", "sessions", ["user_id"])
    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("request", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.Column("result_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error", sa.Text()),
    )
    op.create_index("idx_jobs_user_created", "jobs", ["user_id", "created_at"])
    op.create_index("idx_jobs_status", "jobs", ["status"])
    op.create_table(
        "job_results",
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("results", postgresql.JSONB(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "job_exports",
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("export_format", sa.Text(), primary_key=True),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("job_exports")
    op.drop_table("job_results")
    op.drop_index("idx_jobs_status", table_name="jobs")
    op.drop_index("idx_jobs_user_created", table_name="jobs")
    op.drop_table("jobs")
    op.drop_index("idx_sessions_user_id", table_name="sessions")
    op.drop_index("idx_sessions_active", table_name="sessions")
    op.drop_table("sessions")
    op.drop_table("users")
