"""Add persistent daily planned activities.

Revision ID: 20261119_0002
Revises: 20261119_0001
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20261119_0002"
down_revision: str | None = "20261119_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "planned_activities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column(
            "category_id",
            sa.String(length=48),
            sa.ForeignKey("activity_categories.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("plan_date", sa.Date(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "ends_at > starts_at",
            name="ck_planned_activities_positive_duration",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_planned_activities_owner_id", "planned_activities", ["owner_id"])
    op.create_index(
        "ix_planned_activities_category_id",
        "planned_activities",
        ["category_id"],
    )
    op.create_index(
        "ix_planned_activities_plan_date",
        "planned_activities",
        ["plan_date"],
    )
    op.create_index(
        "ix_planned_activities_owner_date_start",
        "planned_activities",
        ["owner_id", "plan_date", "starts_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_planned_activities_owner_date_start", table_name="planned_activities")
    op.drop_index("ix_planned_activities_plan_date", table_name="planned_activities")
    op.drop_index("ix_planned_activities_category_id", table_name="planned_activities")
    op.drop_index("ix_planned_activities_owner_id", table_name="planned_activities")
    op.drop_table("planned_activities")
