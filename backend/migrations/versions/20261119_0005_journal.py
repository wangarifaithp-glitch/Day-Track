"""Add user-owned journal entries.

Revision ID: 20261119_0005
Revises: 20261119_0004
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20261119_0005"
down_revision: str | None = "20261119_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "journal_entries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_journal_entries_owner_id", "journal_entries", ["owner_id"])
    op.create_index(
        "ix_journal_entries_owner_date",
        "journal_entries",
        ["owner_id", "entry_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_journal_entries_owner_date", table_name="journal_entries")
    op.drop_index("ix_journal_entries_owner_id", table_name="journal_entries")
    op.drop_table("journal_entries")
