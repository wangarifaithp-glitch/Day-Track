"""Add another eight default activity categories.

Revision ID: 20261119_0008
Revises: 20261119_0007
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20261119_0008"
down_revision: str | None = "20261119_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_CATEGORIES = (
    ("gardening-outdoors", "Gardening & Outdoor Time", "#568550", "sprout"),
    ("medical-appointments", "Medical Appointments", "#C44D5C", "stethoscope"),
    ("home-projects", "Home Projects & Repairs", "#A56C48", "hammer"),
    ("professional-development", "Professional Development", "#416BA8", "graduation-cap"),
    ("digital-administration", "Digital Administration", "#487A86", "monitor-cog"),
    ("rest-recovery", "Rest & Recovery", "#6D64A7", "bed"),
    ("events-culture", "Events & Culture", "#B04E83", "ticket"),
    ("childcare-school-runs", "Childcare & School Runs", "#B7673D", "baby"),
)


def upgrade() -> None:
    categories = sa.table(
        "activity_categories",
        sa.column("id", sa.String(length=48)),
        sa.column("name", sa.String(length=80)),
        sa.column("color", sa.String(length=7)),
        sa.column("icon", sa.String(length=40)),
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


def downgrade() -> None:
    categories = sa.table(
        "activity_categories",
        sa.column("id", sa.String(length=48)),
    )
    op.execute(
        sa.delete(categories).where(
            categories.c.id.in_([category_id for category_id, *_ in _CATEGORIES])
        )
    )
