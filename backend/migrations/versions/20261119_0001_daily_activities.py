"""Create activity categories and daily activity records.

Revision ID: 20261119_0001
Revises:
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20261119_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_CATEGORIES = (
    ("personal-care", "Personal Care", "#E6A58D", "heart"),
    ("spiritual", "Spiritual", "#A78BFA", "sparkles"),
    ("learning", "Learning", "#60A5FA", "book-open"),
    ("work", "Work", "#4F9B7A", "briefcase"),
    ("health-fitness", "Health & Fitness", "#E87979", "activity"),
    ("meals", "Meals", "#F2B66D", "utensils"),
    ("family-social", "Family & Social", "#D98BB7", "users"),
    ("chores-responsibilities", "Chores & Responsibilities", "#93A3B5", "house"),
    ("entertainment", "Entertainment", "#8B91E8", "clapperboard"),
    ("social-media", "Social Media", "#67B5C4", "smartphone"),
    ("sleep", "Sleep", "#7C83B8", "moon"),
    ("other", "Other", "#A0A7A2", "circle-ellipsis"),
)


def upgrade() -> None:
    op.create_table(
        "activity_categories",
        sa.Column("id", sa.String(length=48), primary_key=True),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=False),
        sa.Column("icon", sa.String(length=40), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("owner_id", sa.Uuid(), nullable=True),
    )
    categories = sa.table(
        "activity_categories",
        sa.column("id", sa.String()),
        sa.column("name", sa.String()),
        sa.column("color", sa.String()),
        sa.column("icon", sa.String()),
        sa.column("is_default", sa.Boolean()),
    )
    op.bulk_insert(
        categories,
        [
            {
                "id": category_id,
                "name": name,
                "color": color,
                "icon": icon,
                "is_default": True,
            }
            for category_id, name, color, icon in _CATEGORIES
        ],
    )
    op.create_table(
        "activities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column(
            "category_id",
            sa.String(length=48),
            sa.ForeignKey("activity_categories.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("activity_date", sa.Date(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activities_owner_id", "activities", ["owner_id"])
    op.create_index("ix_activities_category_id", "activities", ["category_id"])
    op.create_index("ix_activities_activity_date", "activities", ["activity_date"])
    op.create_index(
        "ix_activities_owner_date_start",
        "activities",
        ["owner_id", "activity_date", "started_at"],
    )
    op.create_index(
        "uq_activities_one_active_per_owner",
        "activities",
        ["owner_id"],
        unique=True,
        postgresql_where=sa.text("ended_at IS NULL"),
        sqlite_where=sa.text("ended_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_activities_one_active_per_owner", table_name="activities")
    op.drop_index("ix_activities_owner_date_start", table_name="activities")
    op.drop_index("ix_activities_activity_date", table_name="activities")
    op.drop_index("ix_activities_category_id", table_name="activities")
    op.drop_index("ix_activities_owner_id", table_name="activities")
    op.drop_table("activities")
    op.drop_table("activity_categories")
