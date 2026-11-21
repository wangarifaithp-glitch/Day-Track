"""Add user-owned goals with progress and target dates.

Revision ID: 20261119_0004
Revises: 20261119_0003
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20261119_0004"
down_revision: str | None = "20261119_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("progress_percent", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('active', 'paused', 'completed')",
            name="ck_goals_status",
        ),
        sa.CheckConstraint(
            "progress_percent BETWEEN 0 AND 100",
            name="ck_goals_progress_percent",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_goals_owner_id", "goals", ["owner_id"])
    op.create_index(
        "ix_goals_owner_status_target",
        "goals",
        ["owner_id", "status", "target_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_goals_owner_status_target", table_name="goals")
    op.drop_index("ix_goals_owner_id", table_name="goals")
    op.drop_table("goals")
