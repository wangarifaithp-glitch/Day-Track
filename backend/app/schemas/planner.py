from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.activity import ActivityCategoryRead
from app.schemas.time import normalize_utc_datetime, serialize_utc_datetime


class PlannedActivityCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=160)
    category_id: str = Field(min_length=1, max_length=48)
    plan_date: date
    starts_at: datetime
    ends_at: datetime
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("starts_at", "ends_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        return normalize_utc_datetime(value)

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class PlannedActivityUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=160)
    category_id: str | None = Field(default=None, min_length=1, max_length=48)
    plan_date: date | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("starts_at", "ends_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        return normalize_utc_datetime(value) if value is not None else None

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class PlannedActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    category_id: str
    category: ActivityCategoryRead
    plan_date: date
    starts_at: datetime
    ends_at: datetime
    duration_seconds: int
    notes: str | None
    created_at: datetime
    updated_at: datetime

    @field_validator("starts_at", "ends_at", "created_at", "updated_at")
    @classmethod
    def normalize_datetimes(cls, value: datetime) -> datetime:
        return serialize_utc_datetime(value)
