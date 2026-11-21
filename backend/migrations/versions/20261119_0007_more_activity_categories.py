"""Add eight more default activity categories.

Revision ID: 20261119_0007
Revises: 20261119_0006
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20261119_0007"
down_revision: str | None = "20261119_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_CATEGORIES = (
    ("transport-commuting", "Transport & Commuting", "#457B9D", "car-front"),
    ("errands-shopping", "Errands & Shopping", "#B77822", "shopping-bag"),
    ("finance-admin", "Finance & Administration", "#58677C", "wallet"),
    ("creative-hobbies", "Creative Hobbies", "#C25B46", "palette"),
    ("pet-care", "Pet Care", "#5D8B42", "paw-print"),
    ("travel-exploration", "Travel & Exploration", "#23827A", "plane"),
    ("volunteering-community", "Volunteering & Community", "#A64F79", "hand-heart"),
    ("caregiving", "Caregiving", "#7655A4", "heart-handshake"),
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
