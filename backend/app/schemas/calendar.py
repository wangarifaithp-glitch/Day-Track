from datetime import date, datetime
from typing import Literal
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.time import serialize_utc_datetime, normalize_utc_datetime


class ReminderInput(BaseModel):
    relative_to: Literal["start", "end"]
    offset_seconds: int = Field(ge=-31_536_000, le=31_536_000)


class CalendarEventCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    start_date: date
    end_date: date
    starts_at: datetime
    ends_at: datetime
    time_zone: str = Field(min_length=1, max_length=64)
    is_all_day: bool = False
    is_important: bool = False
    reminders: list[ReminderInput] = Field(default_factory=list, max_length=10)

    @field_validator("starts_at", "ends_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        return normalize_utc_datetime(value)

    @field_validator("time_zone")
    @classmethod
    def validate_time_zone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Choose a valid IANA time zone.") from exc
        return value

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @model_validator(mode="after")
    def validate_event_range(self) -> "CalendarEventCreate":
        if self.end_date < self.start_date:
            raise ValueError("End date must be on or after start date.")
        if self.ends_at <= self.starts_at:
            raise ValueError("Event end must be after its start.")
        zone = ZoneInfo(self.time_zone)
        if self.starts_at.astimezone(zone).date() != self.start_date:
            raise ValueError("Start timestamp must match the event start date and time zone.")
        if self.ends_at.astimezone(zone).date() != self.end_date:
            raise ValueError("End timestamp must match the event end date and time zone.")
        schedules = [(reminder.relative_to, reminder.offset_seconds) for reminder in self.reminders]
        if len(schedules) != len(set(schedules)):
            raise ValueError("Reminder schedules must be unique.")
        return self


class CalendarReminderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    relative_to: Literal["start", "end"]
    offset_seconds: int
    scheduled_at: datetime
    status: Literal["pending", "sent", "missed"]

    @field_validator("scheduled_at")
    @classmethod
    def normalize_scheduled_at(cls, value: datetime) -> datetime:
        return serialize_utc_datetime(value)


class CalendarEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    start_date: date
    end_date: date
    starts_at: datetime
    ends_at: datetime
    time_zone: str
    is_all_day: bool
    is_important: bool
    reminders: list[CalendarReminderRead]
    created_at: datetime
    updated_at: datetime

    @field_validator("starts_at", "ends_at", "created_at", "updated_at")
    @classmethod
    def normalize_timestamps(cls, value: datetime) -> datetime:
        return serialize_utc_datetime(value)


class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=512)
    auth: str = Field(min_length=1, max_length=256)


class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(min_length=10, max_length=2048)
    keys: PushSubscriptionKeys

    @field_validator("endpoint")
    @classmethod
    def require_https_endpoint(cls, value: str) -> str:
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("Push subscription endpoints must use HTTPS.")
        return value


class PushSubscriptionRead(BaseModel):
    id: UUID


class PushSubscriptionDelete(BaseModel):
    endpoint: str = Field(min_length=10, max_length=2048)


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID | None
    title: str
    body: str
    url: str
    created_at: datetime
    read_at: datetime | None

    @field_validator("created_at", "read_at")
    @classmethod
    def normalize_timestamps(cls, value: datetime | None) -> datetime | None:
        return serialize_utc_datetime(value) if value is not None else None
