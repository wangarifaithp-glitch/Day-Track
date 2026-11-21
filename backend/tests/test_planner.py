from fastapi.testclient import TestClient


def test_create_list_update_and_delete_plan(
    client: TestClient,
) -> None:
    payload = {
        "title": "Focused work",
        "category_id": "work",
        "plan_date": "2026-11-18",
        "starts_at": "2026-11-18T08:00:00Z",
        "ends_at": "2026-11-18T09:30:00Z",
        "notes": "Protect this time",
    }
    created = client.post("/api/v1/planner", json=payload)
    assert created.status_code == 201
    plan = created.json()
    assert plan["title"] == "Focused work"
    assert plan["category"]["name"] == "Work"
    assert plan["duration_seconds"] == 90 * 60

    by_date = client.get("/api/v1/planner", params={"plan_date": "2026-11-18"})
    assert by_date.status_code == 200
    assert [item["id"] for item in by_date.json()] == [plan["id"]]
    assert client.get(f"/api/v1/planner/{plan['id']}").status_code == 200

    updated = client.patch(
        f"/api/v1/planner/{plan['id']}",
        json={"title": "Deep work", "notes": None},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Deep work"
    assert updated.json()["notes"] is None

    deleted = client.delete(f"/api/v1/planner/{plan['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/planner/{plan['id']}").status_code == 404


def test_planner_rejects_invalid_and_overlapping_times(client: TestClient) -> None:
    payload = {
        "title": "Morning reading",
        "category_id": "learning",
        "plan_date": "2026-11-18",
        "starts_at": "2026-11-18T08:00:00Z",
        "ends_at": "2026-11-18T09:00:00Z",
    }
    assert client.post("/api/v1/planner", json=payload).status_code == 201

    overlap = payload | {
        "title": "Overlapping plan",
        "starts_at": "2026-11-18T08:30:00Z",
        "ends_at": "2026-11-18T09:30:00Z",
    }
    assert client.post("/api/v1/planner", json=overlap).status_code == 409

    invalid = payload | {
        "starts_at": "2026-11-18T10:00:00Z",
        "ends_at": "2026-11-18T09:00:00Z",
    }
    assert client.post("/api/v1/planner", json=invalid).status_code == 422

    timezone_naive = payload | {
        "starts_at": "2026-11-18T10:00:00",
    }
    assert client.post("/api/v1/planner", json=timezone_naive).status_code == 422


def test_planner_filters_by_date(client: TestClient) -> None:
    response = client.get("/api/v1/planner", params={"plan_date": "2026-11-19"})
    assert response.status_code == 200
    assert response.json() == []
