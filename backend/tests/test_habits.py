from uuid import UUID

from fastapi.testclient import TestClient

from app.db.session import get_db
from app.models import Habit


def test_habit_crud_and_daily_completion_streak(client: TestClient) -> None:
    created = client.post(
        "/api/v1/habits",
        json={"name": "Read", "description": "Read a few pages."},
    )
    assert created.status_code == 201
    habit = created.json()

    for completion_date in ("2026-11-18", "2026-11-19"):
        completed = client.put(
            f"/api/v1/habits/{habit['id']}/completions/{completion_date}"
        )
        assert completed.status_code == 200
        assert completed.json()["is_completed"] is True

    listed = client.get("/api/v1/habits?habit_date=2026-11-19")
    assert listed.status_code == 200
    assert listed.json()[0]["current_streak"] == 2
    assert listed.json()[0]["is_completed"] is True

    updated = client.patch(
        f"/api/v1/habits/{habit['id']}",
        json={"name": "Read every day", "description": None},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Read every day"
    assert updated.json()["description"] is None

    uncompleted = client.delete(
        f"/api/v1/habits/{habit['id']}/completions/2026-11-19"
    )
    assert uncompleted.status_code == 204
    next_day = client.get("/api/v1/habits?habit_date=2026-11-19").json()[0]
    assert next_day["is_completed"] is False
    assert next_day["current_streak"] == 1

    deleted = client.delete(f"/api/v1/habits/{habit['id']}")
    assert deleted.status_code == 204
    assert client.get("/api/v1/habits?habit_date=2026-11-19").json() == []


def test_habit_validation_and_owner_scoping(client: TestClient) -> None:
    assert client.post("/api/v1/habits", json={"name": "   "}).status_code == 422
    created = client.post("/api/v1/habits", json={"name": "Stretch"})
    assert created.status_code == 201
    habit_id = created.json()["id"]
    assert client.patch(f"/api/v1/habits/{habit_id}", json={}).status_code == 422
    assert (
        client.patch(
            f"/api/v1/habits/{habit_id}",
            json={"name": "   "},
        ).status_code
        == 422
    )

    db_dependency = client.app.dependency_overrides[get_db]
    session_generator = db_dependency()
    session = next(session_generator)
    session.add(
        Habit(
            owner_id=UUID("00000000-0000-4000-8000-000000000002"),
            name="Another owner's habit",
        )
    )
    session.commit()
    try:
        listed = client.get("/api/v1/habits?habit_date=2026-11-19")
        assert listed.status_code == 200
        assert len(listed.json()) == 1
        assert listed.json()[0]["name"] == "Stretch"
        assert (
            client.get("/api/v1/habits/00000000-0000-4000-8000-000000000099").status_code
            == 404
        )
    finally:
        session_generator.close()
