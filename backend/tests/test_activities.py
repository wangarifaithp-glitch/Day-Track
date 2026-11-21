import time
from datetime import UTC, date, datetime

from fastapi.testclient import TestClient


def test_create_list_update_and_delete_activity(
    client: TestClient, activity_payload: dict[str, object]
) -> None:
    created = client.post("/api/v1/activities", json=activity_payload)
    assert created.status_code == 201
    activity = created.json()
    assert activity["title"] == "Read a chapter"
    assert activity["category"]["name"] == "Learning"
    assert activity["duration_seconds"] == 45 * 60
    assert activity["is_active"] is False

    listed = client.get("/api/v1/activities", params={"activity_date": "2026-11-18"})
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [activity["id"]]
    assert client.get("/api/v1/activities/history").json()[0]["id"] == activity["id"]

    updated = client.patch(
        f"/api/v1/activities/{activity['id']}",
        json={"title": "Read two chapters", "notes": None},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Read two chapters"
    assert updated.json()["notes"] is None

    deleted = client.delete(f"/api/v1/activities/{activity['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/activities/{activity['id']}").status_code == 404


def test_rejects_invalid_ranges_and_timezone_naive_timestamps(
    client: TestClient, activity_payload: dict[str, object]
) -> None:
    payload = activity_payload.copy()
    payload["ended_at"] = payload["started_at"]
    assert client.post("/api/v1/activities", json=payload).status_code == 422

    payload = activity_payload.copy()
    payload["ended_at"] = "2026-11-18T07:59:00Z"
    assert client.post("/api/v1/activities", json=payload).status_code == 422

    payload = activity_payload.copy()
    payload["started_at"] = "2026-11-18T08:00:00"
    assert client.post("/api/v1/activities", json=payload).status_code == 422


def test_rejects_overlapping_activities(
    client: TestClient, activity_payload: dict[str, object]
) -> None:
    assert client.post("/api/v1/activities", json=activity_payload).status_code == 201
    overlap = activity_payload | {
        "title": "Another task",
        "started_at": "2026-11-18T08:30:00Z",
        "ended_at": "2026-11-18T09:00:00Z",
    }
    response = client.post("/api/v1/activities", json=overlap)
    assert response.status_code == 409
    assert "overlaps" in response.json()["detail"]


def test_update_rejects_invalid_and_overlapping_ranges(
    client: TestClient, activity_payload: dict[str, object]
) -> None:
    first = client.post("/api/v1/activities", json=activity_payload).json()
    second_payload = activity_payload | {
        "title": "Plan the day",
        "started_at": "2026-11-18T09:00:00Z",
        "ended_at": "2026-11-18T09:30:00Z",
    }
    second = client.post("/api/v1/activities", json=second_payload).json()

    overlapping = client.patch(
        f"/api/v1/activities/{second['id']}",
        json={
            "started_at": "2026-11-18T08:30:00Z",
            "ended_at": "2026-11-18T09:15:00Z",
        },
    )
    assert overlapping.status_code == 409

    invalid = client.patch(
        f"/api/v1/activities/{first['id']}",
        json={
            "started_at": "2026-11-18T09:00:00Z",
            "ended_at": "2026-11-18T08:00:00Z",
        },
    )
    assert invalid.status_code == 422


def test_timer_starts_recovers_stops_and_prevents_parallel_activity(
    client: TestClient,
) -> None:
    started = client.post(
        "/api/v1/activities/start",
        json={
            "title": "Focused work",
            "category_id": "work",
            "activity_date": date.today().isoformat(),
        },
    )
    assert started.status_code == 201
    activity_id = started.json()["id"]
    assert started.json()["is_active"] is True
    assert started.json()["started_at"].endswith(("Z", "+00:00"))

    recovered = client.get("/api/v1/activities/active")
    assert recovered.status_code == 200
    assert recovered.json()["id"] == activity_id
    assert recovered.json()["duration_seconds"] >= 0

    duplicate = client.post(
        "/api/v1/activities/start",
        json={
            "title": "Second timer",
            "category_id": "learning",
            "activity_date": date.today().isoformat(),
        },
    )
    assert duplicate.status_code == 409

    time.sleep(0.02)
    stopped = client.post(f"/api/v1/activities/{activity_id}/stop")
    assert stopped.status_code == 200
    assert stopped.json()["is_active"] is False
    assert datetime.fromisoformat(stopped.json()["ended_at"]) >= datetime.fromisoformat(
        stopped.json()["started_at"]
    )
    assert client.get("/api/v1/activities/active").json() is None


def test_list_activities_filters_by_activity_date(
    client: TestClient, activity_payload: dict[str, object]
) -> None:
    assert client.post("/api/v1/activities", json=activity_payload).status_code == 201
    assert (
        client.get("/api/v1/activities", params={"activity_date": "2026-11-19"}).json()
        == []
    )


def test_activity_history_filters_by_date_range(
    client: TestClient, activity_payload: dict[str, object]
) -> None:
    created = client.post("/api/v1/activities", json=activity_payload)
    assert created.status_code == 201

    matching = client.get(
        "/api/v1/activities/history",
        params={"start_date": "2026-11-18", "end_date": "2026-11-18"},
    )
    outside_range = client.get(
        "/api/v1/activities/history",
        params={"start_date": "2026-11-19"},
    )
    invalid_range = client.get(
        "/api/v1/activities/history",
        params={"start_date": "2026-11-19", "end_date": "2026-11-18"},
    )

    assert [activity["id"] for activity in matching.json()] == [created.json()["id"]]
    assert outside_range.json() == []
    assert invalid_range.status_code == 422


def test_categories_include_starter_categories(client: TestClient) -> None:
    categories = client.get("/api/v1/categories")
    assert categories.status_code == 200
    category_ids = {category["id"] for category in categories.json()}
    assert {"learning", "work"} <= category_ids
    assert {
        "transport-commuting",
        "errands-shopping",
        "finance-admin",
        "creative-hobbies",
        "pet-care",
        "travel-exploration",
        "volunteering-community",
        "caregiving",
    } <= category_ids
    assert {
        "gardening-outdoors",
        "medical-appointments",
        "home-projects",
        "professional-development",
        "digital-administration",
        "rest-recovery",
        "events-culture",
        "childcare-school-runs",
    } <= category_ids


def test_category_list_does_not_expose_another_owners_category(
    client: TestClient,
) -> None:
    response = client.get("/api/v1/categories")
    assert response.status_code == 200
    assert "private-custom" not in {category["id"] for category in response.json()}

    activity = client.post(
        "/api/v1/activities",
        json={
            "title": "Private category activity",
            "category_id": "private-custom",
            "activity_date": "2026-11-18",
            "started_at": "2026-11-18T10:00:00Z",
            "ended_at": "2026-11-18T10:30:00Z",
        },
    )
    assert activity.status_code == 404
