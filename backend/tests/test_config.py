import pytest
from fastapi import HTTPException, status

from app.core.config import BACKEND_ENV_FILE, Settings


def test_cors_origins_are_loaded_from_comma_separated_value() -> None:
    settings = Settings(
        CORS_ORIGINS="http://localhost:5173, http://127.0.0.1:5173"
    )

    assert settings.cors_origins == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_frontend_url_is_included_in_allowed_origins() -> None:
    settings = Settings(
        _env_file=None,
        app_base_url="https://day-track-1.onrender.com/",
        cors_origins=["http://localhost:5173/"],
    )

    assert settings.allowed_origins == [
        "http://localhost:5173",
        "https://day-track-1.onrender.com",
    ]


def test_database_url_has_a_default() -> None:
    settings = Settings(_env_file=None)

    assert settings.database_url.startswith("postgresql+psycopg://")


def test_database_url_can_be_overridden_by_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    expected = "postgresql+psycopg://daytrack:test-password@localhost:5432/daywise"
    monkeypatch.setenv("DATABASE_URL", expected)

    assert Settings(_env_file=None).database_url == expected


@pytest.mark.parametrize(
    "database_url",
    [
        "postgres://daytrack:test-password@db.example.com/daywise",
        "postgresql://daytrack:test-password@db.example.com/daywise",
        "postgresql+psycopg2://daytrack:test-password@db.example.com/daywise",
    ],
)
def test_database_url_uses_installed_psycopg_v3_driver(database_url: str) -> None:
    settings = Settings(_env_file=None, database_url=database_url)

    assert settings.database_url == (
        "postgresql+psycopg://daytrack:test-password@db.example.com/daywise"
    )


def test_app_defaults_to_non_development_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("APP_ENV", raising=False)
    assert Settings(_env_file=None).app_env == "production"


def test_backend_env_file_path_is_independent_of_current_directory() -> None:
    from pathlib import Path

    assert BACKEND_ENV_FILE == Path(__file__).resolve().parents[1] / ".env"


def test_activity_owner_is_disabled_outside_development(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import development

    monkeypatch.setattr(
        development, "get_settings", lambda: Settings(app_env="production")
    )

    with pytest.raises(HTTPException) as error:
        development.get_activity_owner_id()
    assert error.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
