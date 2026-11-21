from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.time import serialize_utc_datetime


class JournalEntryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    entry_date: date
    title: str | None = Field(default=None, max_length=160)
    content: str = Field(min_length=1, max_length=50000)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @field_validator("content")
    @classmethod
    def require_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Journal entry content cannot be empty.")
        return value


class JournalEntryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    entry_date: date | None = None
    title: str | None = Field(default=None, max_length=160)
    content: str | None = Field(default=None, min_length=1, max_length=50000)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @field_validator("content")
    @classmethod
    def require_content(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Journal entry content cannot be empty.")
        return value

    @model_validator(mode="after")
    def require_update_fields(self) -> "JournalEntryUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one journal entry field to update.")
        return self


class JournalEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    entry_date: date
    title: str | None
    content: str
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def normalize_timestamps(cls, value: datetime) -> datetime:
        return serialize_utc_datetime(value)
