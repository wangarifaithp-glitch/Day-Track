from fastapi.testclient import TestClient


def test_create_list_update_and_delete_goal(client: TestClient) -> None:
    payload = {
        "title": "Build a steady reading habit",
        "description": "Read for a little while most days.",
        "target_date": "2027-03-01",
        "progress_percent": 20,
    }
    created = client.post("/api/v1/goals", json=payload)
    assert created.status_code == 201
    goal = created.json()
    assert goal["title"] == payload["title"]
    assert goal["progress_percent"] == 20
    assert goal["status"] == "active"

    listed = client.get("/api/v1/goals")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [goal["id"]]
    assert client.get(f"/api/v1/goals/{goal['id']}").status_code == 200

    updated = client.patch(
        f"/api/v1/goals/{goal['id']}",
        json={
            "title": "Read more consistently",
            "progress_percent": 100,
            "status": "completed",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Read more consistently"
    assert updated.json()["progress_percent"] == 100
    assert updated.json()["status"] == "completed"

    deleted = client.delete(f"/api/v1/goals/{goal['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/goals/{goal['id']}").status_code == 404


def test_goal_validation_rejects_empty_titles_bad_progress_and_empty_updates(
    client: TestClient,
) -> None:
    assert client.post("/api/v1/goals", json={"title": "   "}).status_code == 422
    assert client.post("/api/v1/goals", json={"title": "Run", "progress_percent": 101}).status_code == 422
    assert client.post("/api/v1/goals", json={"title": "Run", "status": "someday"}).status_code == 422

    created = client.post("/api/v1/goals", json={"title": "Run a 5K"})
    assert created.status_code == 201
    goal_id = created.json()["id"]
    assert client.patch(f"/api/v1/goals/{goal_id}", json={}).status_code == 422
    assert client.patch(
        f"/api/v1/goals/{goal_id}",
        json={"progress_percent": None},
    ).status_code == 422


def test_goal_list_is_scoped_to_the_development_owner(client: TestClient) -> None:
    from uuid import UUID

    from app.models import Goal
    from app.db.session import get_db

    response = client.post("/api/v1/goals", json={"title": "My goal"})
    assert response.status_code == 201

    db_dependency = client.app.dependency_overrides[get_db]
    session_generator = db_dependency()
    session = next(session_generator)
    session.add(
        Goal(
            owner_id=UUID("00000000-0000-4000-8000-000000000002"),
            title="Another owner goal",
            progress_percent=0,
            status="active",
        )
    )
    session.commit()
    try:
        listed = client.get("/api/v1/goals")
        assert listed.status_code == 200
        assert len(listed.json()) == 1
        assert listed.json()[0]["title"] == "My goal"
    finally:
        session_generator.close()
