"""Add habits and dated completions.

Revision ID: 20261119_0006
Revises: 20261119_0005
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20261119_0006"
down_revision: str | None = "20261119_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "habits",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_habits_owner_id", "habits", ["owner_id"])
    op.create_index("ix_habits_owner_name", "habits", ["owner_id", "name"])
    op.create_table(
        "habit_completions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("habit_id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("completion_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["habit_id"],
            ["habits.id"],
            name="fk_habit_completions_habit_id_habits",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "habit_id",
            "completion_date",
            name="uq_habit_completion_date",
        ),
    )
    op.create_index("ix_habit_completions_habit_id", "habit_completions", ["habit_id"])
    op.create_index(
        "ix_habit_completions_owner_date",
        "habit_completions",
        ["owner_id", "completion_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_habit_completions_owner_date", table_name="habit_completions")
    op.drop_index("ix_habit_completions_habit_id", table_name="habit_completions")
    op.drop_table("habit_completions")
    op.drop_index("ix_habits_owner_name", table_name="habits")
    op.drop_index("ix_habits_owner_id", table_name="habits")
    op.drop_table("habits")
