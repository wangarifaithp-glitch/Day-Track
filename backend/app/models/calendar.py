from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import UTCDateTime


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="ck_calendar_events_date_range"),
        CheckConstraint("ends_at > starts_at", name="ck_calendar_events_time_range"),
        Index("ix_calendar_events_owner_dates", "owner_id", "start_date", "end_date"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    time_zone: Mapped[str] = mapped_column(String(64), nullable=False)
    is_all_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_important: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    reminders: Mapped[list[CalendarReminder]] = relationship(
        back_populates="event",
        cascade="all, delete-orphan",
        order_by="CalendarReminder.scheduled_at",
    )


class CalendarReminder(Base):
    __tablename__ = "calendar_reminders"
    __table_args__ = (
        CheckConstraint("relative_to IN ('start', 'end')", name="ck_calendar_reminders_anchor"),
        CheckConstraint(
            "status IN ('pending', 'sent', 'missed')",
            name="ck_calendar_reminders_status",
        ),
        UniqueConstraint(
            "event_id",
            "relative_to",
            "offset_seconds",
            name="uq_calendar_reminders_schedule",
        ),
        Index("ix_calendar_reminders_due", "status", "scheduled_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    event_id: Mapped[UUID] = mapped_column(
        ForeignKey("calendar_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relative_to: Mapped[str] = mapped_column(String(8), nullable=False)
    offset_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)

    event: Mapped[CalendarEvent] = relationship(back_populates="reminders")
    notification: Mapped[InAppNotification | None] = relationship(back_populates="reminder")


class InAppNotification(Base):
    __tablename__ = "in_app_notifications"
    __table_args__ = (
        Index("ix_in_app_notifications_owner_created", "owner_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)
    event_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("calendar_events.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reminder_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("calendar_reminders.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str] = mapped_column(String(300), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=lambda: datetime.now(UTC), nullable=False
    )
    read_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)

    reminder: Mapped[CalendarReminder | None] = relationship(back_populates="notification")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    __table_args__ = (UniqueConstraint("endpoint", name="uq_push_subscriptions_endpoint"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)
    endpoint: Mapped[str] = mapped_column(Text, nullable=False)
    p256dh_key: Mapped[str] = mapped_column(String(512), nullable=False)
    auth_key: Mapped[str] = mapped_column(String(256), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
