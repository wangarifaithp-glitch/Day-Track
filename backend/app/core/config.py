from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "DAYTRACK"
    app_env: str = "production"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://daywise:change-me@localhost:5432/daywise"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    vapid_private_key_file: Path | None = None
    vapid_public_key: str | None = None
    vapid_subject: str = "mailto:daywise@example.invalid"
    reminder_poll_seconds: int = 15

    @field_validator("database_url", mode="before")
    @classmethod
    def use_psycopg_v3_driver(cls, value: object) -> object:
        if not isinstance(value, str):
            return value

        for scheme in (
            "postgres://",
            "postgresql://",
            "postgresql+psycopg2://",
        ):
            if value.startswith(scheme):
                return f"postgresql+psycopg://{value[len(scheme):]}"
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
