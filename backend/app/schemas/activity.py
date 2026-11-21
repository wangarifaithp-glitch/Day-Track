from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.time import normalize_utc_datetime, serialize_utc_datetime


class ActivityCategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    color: str
    icon: str
    is_default: bool


class ActivityCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=160)
    category_id: str = Field(min_length=1, max_length=48)
    activity_date: date
    started_at: datetime
    ended_at: datetime
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("started_at", "ended_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        return normalize_utc_datetime(value)

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class ActivityStart(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=160)
    category_id: str = Field(min_length=1, max_length=48)
    activity_date: date
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class ActivityUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=160)
    category_id: str | None = Field(default=None, min_length=1, max_length=48)
    activity_date: date | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("started_at", "ended_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        return normalize_utc_datetime(value) if value is not None else None

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    category_id: str
    category: ActivityCategoryRead
    activity_date: date
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int
    is_active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    @field_validator("started_at", "ended_at", "created_at", "updated_at")
    @classmethod
    def normalize_datetimes(cls, value: datetime | None) -> datetime | None:
        return serialize_utc_datetime(value) if value is not None else None
