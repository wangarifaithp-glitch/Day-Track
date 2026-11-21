from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.development import DEVELOPMENT_OWNER_ID
from app.db.base import Base
from app.models import CalendarEvent, CalendarReminder, InAppNotification
from app.services.reminders import dispatch_due_reminders


def event_payload() -> dict[str, object]:
    return {
        "title": "Project presentation",
        "description": "Review the final slides",
        "start_date": "2026-11-25",
        "end_date": "2026-11-25",
        "starts_at": "2026-11-25T09:00:00Z",
        "ends_at": "2026-11-25T10:00:00Z",
        "time_zone": "UTC",
        "is_all_day": False,
        "is_important": True,
        "reminders": [
            {"relative_to": "start", "offset_seconds": -86400},
            {"relative_to": "start", "offset_seconds": -3600},
            {"relative_to": "start", "offset_seconds": -900},
            {"relative_to": "start", "offset_seconds": 0},
            {"relative_to": "end", "offset_seconds": 0},
            {"relative_to": "end", "offset_seconds": 1800},
        ],
    }


def test_calendar_event_crud_reminders_and_date_range(client: TestClient) -> None:
    created = client.post("/api/v1/calendar/events", json=event_payload())
    assert created.status_code == 201
    event = created.json()
    assert event["title"] == "Project presentation"
    assert event["is_important"] is True
    assert len(event["reminders"]) == 6
    assert event["reminders"][0]["scheduled_at"] == "2026-11-24T09:00:00Z"

    included = client.get(
        "/api/v1/calendar/events",
        params={"start_date": "2026-11-25", "end_date": "2026-11-25"},
    )
    excluded = client.get(
        "/api/v1/calendar/events",
        params={"start_date": "2026-11-26", "end_date": "2026-11-30"},
    )
    invalid_range = client.get(
        "/api/v1/calendar/events",
        params={"start_date": "2026-11-30", "end_date": "2026-11-25"},
    )
    assert [item["id"] for item in included.json()] == [event["id"]]
    assert excluded.json() == []
    assert invalid_range.status_code == 422

    updated_payload = event_payload() | {
        "title": "Final presentation",
        "is_important": False,
        "reminders": [{"relative_to": "start", "offset_seconds": -600}],
    }
    updated = client.put(
        f"/api/v1/calendar/events/{event['id']}",
        json=updated_payload,
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Final presentation"
    assert updated.json()["is_important"] is False
    assert len(updated.json()["reminders"]) == 1

    deleted = client.delete(f"/api/v1/calendar/events/{event['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/calendar/events/{event['id']}").status_code == 404


def test_calendar_event_validates_ranges_timezone_and_reminders(
    client: TestClient,
) -> None:
    payload = event_payload()
    payload["ends_at"] = "2026-11-25T09:00:00Z"
    assert client.post("/api/v1/calendar/events", json=payload).status_code == 422

    payload = event_payload()
    payload["time_zone"] = "Not/AZone"
    assert client.post("/api/v1/calendar/events", json=payload).status_code == 422

    payload = event_payload()
    payload["starts_at"] = "2026-11-25T10:00:00"
    assert client.post("/api/v1/calendar/events", json=payload).status_code == 422

    payload = event_payload()
    payload["reminders"] = [
        {"relative_to": "start", "offset_seconds": 0},
        {"relative_to": "start", "offset_seconds": 0},
    ]
    assert client.post("/api/v1/calendar/events", json=payload).status_code == 422


def test_all_day_multi_day_events_are_included_on_each_day(client: TestClient) -> None:
    payload = event_payload() | {
        "start_date": "2026-11-25",
        "end_date": "2026-11-27",
        "starts_at": "2026-11-25T09:00:00Z",
        "ends_at": "2026-11-27T17:00:00Z",
        "is_all_day": True,
        "reminders": [],
    }
    created = client.post("/api/v1/calendar/events", json=payload)
    assert created.status_code == 201
    for day in ("2026-11-25", "2026-11-26", "2026-11-27"):
        response = client.get(
            "/api/v1/calendar/events",
            params={"start_date": day, "end_date": day},
        )
        assert [event["id"] for event in response.json()] == [created.json()["id"]]


def test_reminder_dispatch_creates_one_in_app_notification() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    now = datetime(2026, 11, 24, 9, 0, tzinfo=UTC)
    try:
        with Session(engine, expire_on_commit=False) as db:
            event = CalendarEvent(
                owner_id=DEVELOPMENT_OWNER_ID,
                title="Project presentation",
                start_date=date(2026, 11, 25),
                end_date=date(2026, 11, 25),
                starts_at=datetime(2026, 11, 25, 9, 0, tzinfo=UTC),
                ends_at=datetime(2026, 11, 25, 10, 0, tzinfo=UTC),
                time_zone="UTC",
                is_all_day=False,
                is_important=True,
            )
            reminder = CalendarReminder(
                event=event,
                relative_to="start",
                offset_seconds=-86400,
                scheduled_at=now - timedelta(seconds=1),
                status="pending",
            )
            db.add_all([event, reminder])
            db.commit()

            assert dispatch_due_reminders(db, now=now) == 1
            assert reminder.status == "sent"
            notification = db.scalar(select(InAppNotification))
            assert notification is not None
            assert notification.title == "Project presentation"
            assert notification.body == "Project presentation is coming up."
            assert notification.event_id == event.id
            assert notification.reminder_id == reminder.id
            assert isinstance(event.id, UUID)
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_notification_api_and_push_subscription_configuration(
    client: TestClient,
    monkeypatch,
    tmp_path,
) -> None:
    from app.api.v1.endpoints import notifications
    from app.core.config import Settings

    key_file = tmp_path / "vapid.pem"
    key_file.write_text("test-only-key", encoding="utf-8")
    monkeypatch.setattr(
        notifications,
        "get_settings",
        lambda: Settings(vapid_private_key_file=key_file, vapid_public_key="test-public-key"),
    )
    assert client.get("/api/v1/notifications/push/public-key").json() == {
        "enabled": True,
        "public_key": "test-public-key",
    }

    payload = {
        "endpoint": "https://push.example.test/subscription/abc",
        "keys": {"p256dh": "public-key", "auth": "auth-key"},
    }
    created = client.post("/api/v1/notifications/push-subscriptions", json=payload)
    assert created.status_code == 201
    assert created.json()["id"]
    assert client.post("/api/v1/notifications/push-subscriptions", json=payload).status_code == 201

    assert client.get("/api/v1/notifications").json() == []
    assert client.post(
        "/api/v1/notifications/00000000-0000-4000-8000-000000000001/read"
    ).status_code == 404
