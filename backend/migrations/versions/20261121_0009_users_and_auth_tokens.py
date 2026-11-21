"""Add user accounts and one-time authentication tokens.

Revision ID: 20261121_0009
Revises: 20261119_0008
Create Date: 2026-11-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.db.types import UTCDateTime


revision: str = "20261121_0009"
down_revision: str | None = "20261119_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", UTCDateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "auth_tokens",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("purpose", sa.String(length=24), nullable=False),
        sa.Column("expires_at", UTCDateTime(), nullable=False),
        sa.Column("used_at", UTCDateTime(), nullable=True),
        sa.Column("created_at", UTCDateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_auth_tokens_user_id", "auth_tokens", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_auth_tokens_user_id", table_name="auth_tokens")
    op.drop_table("auth_tokens")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
