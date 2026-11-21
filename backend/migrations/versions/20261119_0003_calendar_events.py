"""Add calendar events, reminders, notifications, and push subscriptions.

Revision ID: 20261119_0003
Revises: 20261119_0002
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20261119_0003"
down_revision: str | None = "20261119_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "calendar_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("time_zone", sa.String(length=64), nullable=False),
        sa.Column("is_all_day", sa.Boolean(), nullable=False),
        sa.Column("is_important", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("end_date >= start_date", name="ck_calendar_events_date_range"),
        sa.CheckConstraint("ends_at > starts_at", name="ck_calendar_events_time_range"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_calendar_events_owner_id", "calendar_events", ["owner_id"])
    op.create_index(
        "ix_calendar_events_owner_dates",
        "calendar_events",
        ["owner_id", "start_date", "end_date"],
    )

    op.create_table(
        "calendar_reminders",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("relative_to", sa.String(length=8), nullable=False),
        sa.Column("offset_seconds", sa.Integer(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "relative_to IN ('start', 'end')",
            name="ck_calendar_reminders_anchor",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'sent', 'missed')",
            name="ck_calendar_reminders_status",
        ),
        sa.ForeignKeyConstraint(["event_id"], ["calendar_events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "event_id",
            "relative_to",
            "offset_seconds",
            name="uq_calendar_reminders_schedule",
        ),
    )
    op.create_index("ix_calendar_reminders_event_id", "calendar_reminders", ["event_id"])
    op.create_index(
        "ix_calendar_reminders_due",
        "calendar_reminders",
        ["status", "scheduled_at"],
    )

    op.create_table(
        "in_app_notifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=True),
        sa.Column("reminder_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("body", sa.String(length=500), nullable=False),
        sa.Column("url", sa.String(length=300), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["calendar_events.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["reminder_id"], ["calendar_reminders.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reminder_id"),
    )
    op.create_index("ix_in_app_notifications_owner_id", "in_app_notifications", ["owner_id"])
    op.create_index("ix_in_app_notifications_event_id", "in_app_notifications", ["event_id"])
    op.create_index(
        "ix_in_app_notifications_owner_created",
        "in_app_notifications",
        ["owner_id", "created_at"],
    )

    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh_key", sa.String(length=512), nullable=False),
        sa.Column("auth_key", sa.String(length=256), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("endpoint", name="uq_push_subscriptions_endpoint"),
    )
    op.create_index("ix_push_subscriptions_owner_id", "push_subscriptions", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_push_subscriptions_owner_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
    op.drop_index(
        "ix_in_app_notifications_owner_created",
        table_name="in_app_notifications",
    )
    op.drop_index("ix_in_app_notifications_event_id", table_name="in_app_notifications")
    op.drop_index("ix_in_app_notifications_owner_id", table_name="in_app_notifications")
    op.drop_table("in_app_notifications")
    op.drop_index("ix_calendar_reminders_due", table_name="calendar_reminders")
    op.drop_index("ix_calendar_reminders_event_id", table_name="calendar_reminders")
    op.drop_table("calendar_reminders")
    op.drop_index("ix_calendar_events_owner_dates", table_name="calendar_events")
    op.drop_index("ix_calendar_events_owner_id", table_name="calendar_events")
    op.drop_table("calendar_events")
