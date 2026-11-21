from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, ForeignKey, Index, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import UTCDateTime


class ActivityCategory(Base):
    __tablename__ = "activity_categories"

    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False)
    icon: Mapped[str] = mapped_column(String(40), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    owner_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)

    activities: Mapped[list["Activity"]] = relationship(back_populates="category")
    planned_activities: Mapped[list["PlannedActivity"]] = relationship(
        back_populates="category"
    )


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        Index(
            "uq_activities_one_active_per_owner",
            "owner_id",
            unique=True,
            postgresql_where=text("ended_at IS NULL"),
            sqlite_where=text("ended_at IS NULL"),
        ),
        Index("ix_activities_owner_date_start", "owner_id", "activity_date", "started_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    category_id: Mapped[str] = mapped_column(
        ForeignKey("activity_categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    activity_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    category: Mapped[ActivityCategory] = relationship(back_populates="activities")

    @property
    def duration_seconds(self) -> int:
        end = self.ended_at or datetime.now(UTC)
        start = self.started_at
        if start.tzinfo is None:
            start = start.replace(tzinfo=UTC)
        if end.tzinfo is None:
            end = end.replace(tzinfo=UTC)
        return max(0, int((end - start).total_seconds()))

    @property
    def is_active(self) -> bool:
        return self.ended_at is None
