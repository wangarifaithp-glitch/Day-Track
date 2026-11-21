from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import auth as auth_endpoints
from app.core import auth as auth_core, development as development_core
from app.core.config import Settings
from app.services import auth_email


@pytest.fixture
def auth_setup(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str, str]]:
    settings = Settings(
        _env_file=None,
        app_env="production",
        auth_secret_key="test-signing-key-that-is-at-least-thirty-two-characters",
        app_base_url="https://daytrack.example.com",
        smtp_host="smtp.example.com",
        smtp_port=587,
        smtp_sender="noreply@example.com",
    )
    monkeypatch.setattr(auth_endpoints, "get_settings", lambda: settings)
    monkeypatch.setattr(auth_core, "get_settings", lambda: settings)
    monkeypatch.setattr(auth_email, "get_settings", lambda: settings)
    sent_emails: list[tuple[str, str, str]] = []
    monkeypatch.setattr(
        auth_endpoints,
        "send_email",
        lambda recipient, subject, body: sent_emails.append((recipient, subject, body)),
    )
    return sent_emails


def _token_from_email(body: str) -> str:
    link = next(line for line in body.splitlines() if line.startswith("https://"))
    return parse_qs(urlparse(link).query)["token"][0]


def test_signup_verification_login_and_http_only_session(
    client: TestClient,
    auth_setup: list[tuple[str, str, str]],
) -> None:
    registration = client.post(
        "/api/v1/auth/register",
        json={"name": "Day Tracker", "email": "Person@Example.com", "password": "secure-pass-123"},
    )
    assert registration.status_code == 202
    assert registration.json()["message"] == "Check your email for a verification link."
    assert auth_setup[0][0] == "person@example.com"

    verification_token = _token_from_email(auth_setup[0][2])
    verification = client.post(
        "/api/v1/auth/verify-email",
        json={"token": verification_token},
    )
    assert verification.status_code == 200

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "person@example.com", "password": "secure-pass-123"},
    )
    assert login.status_code == 200
    assert "access_token" not in login.json()
    assert "httponly" in login.headers["set-cookie"].lower()
    assert "secure" in login.headers["set-cookie"].lower()
    session_cookie = client.cookies.get("daytrack_session")
    assert session_cookie
    client.cookies.clear()
    client.cookies.set("daytrack_session", session_cookie)

    current_user = client.get("/api/v1/auth/me")
    assert current_user.status_code == 200
    assert current_user.json()["email"] == "person@example.com"
    assert current_user.json()["name"] == "Day Tracker"

    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 200
    assert "max-age=0" in logout.headers["set-cookie"].lower()
    client.cookies.clear()
    assert client.get("/api/v1/auth/me").status_code == 401


def test_unverified_account_cannot_login(
    client: TestClient,
    auth_setup: list[tuple[str, str, str]],
) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Needs Verify", "email": "verify@example.com", "password": "secure-pass-123"},
    )

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "verify@example.com", "password": "secure-pass-123"},
    )
    assert login.status_code == 403


def test_state_changing_request_rejects_untrusted_origin(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/logout",
        headers={"Origin": "https://malicious.example"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "This request origin is not allowed."


def test_password_reset_invalidates_old_password_and_session(
    client: TestClient,
    auth_setup: list[tuple[str, str, str]],
) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Reset User", "email": "reset@example.com", "password": "secure-pass-123"},
    )
    verification_token = _token_from_email(auth_setup[-1][2])
    client.post("/api/v1/auth/verify-email", json={"token": verification_token})
    client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "secure-pass-123"},
    )
    old_session_cookie = client.cookies.get("daytrack_session")
    assert old_session_cookie
    client.cookies.clear()
    client.cookies.set("daytrack_session", old_session_cookie)

    client.post("/api/v1/auth/forgot-password", json={"email": "reset@example.com"})
    reset_token = _token_from_email(auth_setup[-1][2])
    reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "new-secure-pass-456"},
    )
    assert reset.status_code == 200
    assert client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "secure-pass-123"},
    ).status_code == 401

    client.cookies.set("daytrack_session", old_session_cookie)
    assert client.get("/api/v1/auth/me").status_code == 401
    client.cookies.clear()
    assert client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "new-secure-pass-456"},
    ).status_code == 200


def test_production_data_requires_auth_and_is_user_scoped(
    client: TestClient,
    auth_setup: list[tuple[str, str, str]],
    monkeypatch: pytest.MonkeyPatch,
    activity_payload: dict[str, object],
) -> None:
    from app.core.development import get_activity_owner_id

    client.app.dependency_overrides.pop(get_activity_owner_id, None)
    monkeypatch.setattr(
        development_core,
        "get_settings",
        lambda: Settings(_env_file=None, app_env="production"),
    )
    assert client.get("/api/v1/activities/active").status_code == 401

    client.post(
        "/api/v1/auth/register",
        json={"name": "First User", "email": "first@example.com", "password": "secure-pass-123"},
    )
    first_verification_token = _token_from_email(auth_setup[-1][2])
    client.post("/api/v1/auth/verify-email", json={"token": first_verification_token})
    client.post(
        "/api/v1/auth/login",
        json={"email": "first@example.com", "password": "secure-pass-123"},
    )
    first_session = client.cookies.get("daytrack_session")
    assert first_session
    client.cookies.clear()
    client.cookies.set("daytrack_session", first_session)

    created = client.post("/api/v1/activities", json=activity_payload)
    assert created.status_code == 201
    client.post("/api/v1/auth/logout")
    client.cookies.clear()

    client.post(
        "/api/v1/auth/register",
        json={"name": "Second User", "email": "second@example.com", "password": "secure-pass-123"},
    )
    second_verification_token = _token_from_email(auth_setup[-1][2])
    client.post("/api/v1/auth/verify-email", json={"token": second_verification_token})
    client.post(
        "/api/v1/auth/login",
        json={"email": "second@example.com", "password": "secure-pass-123"},
    )
    second_session = client.cookies.get("daytrack_session")
    assert second_session
    client.cookies.clear()
    client.cookies.set("daytrack_session", second_session)

    response = client.get(
        "/api/v1/activities",
        params={"activity_date": activity_payload["activity_date"]},
    )
    assert response.status_code == 200
    assert response.json() == []
