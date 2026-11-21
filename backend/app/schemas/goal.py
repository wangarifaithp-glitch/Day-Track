from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.time import serialize_utc_datetime


GoalStatus = Literal["active", "paused", "completed"]


class GoalCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    target_date: date | None = None
    progress_percent: int = Field(default=0, ge=0, le=100)
    status: GoalStatus = "active"

    @field_validator("title")
    @classmethod
    def require_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Goal title cannot be empty.")
        return value

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class GoalUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    target_date: date | None = None
    progress_percent: int | None = Field(default=None, ge=0, le=100)
    status: GoalStatus | None = None

    @field_validator("title")
    @classmethod
    def require_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Goal title cannot be empty.")
        return value

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @model_validator(mode="after")
    def require_update_fields(self) -> "GoalUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one goal field to update.")
        return self


class GoalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    target_date: date | None
    progress_percent: int
    status: GoalStatus
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def normalize_timestamps(cls, value: datetime) -> datetime:
        return serialize_utc_datetime(value)
