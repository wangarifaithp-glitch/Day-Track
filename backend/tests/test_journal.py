from datetime import date
from uuid import UUID

from fastapi.testclient import TestClient

from app.db.session import get_db
from app.models import JournalEntry


def test_create_list_update_and_delete_journal_entry(client: TestClient) -> None:
    payload = {
        "entry_date": "2026-11-19",
        "title": "A thoughtful day",
        "content": "I made time to slow down and reflect.",
    }
    created = client.post("/api/v1/journal", json=payload)
    assert created.status_code == 201
    entry = created.json()
    assert entry["entry_date"] == payload["entry_date"]
    assert entry["title"] == payload["title"]
    assert entry["content"] == payload["content"]

    listed = client.get("/api/v1/journal?limit=10&offset=0")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [entry["id"]]
    assert client.get(f"/api/v1/journal/{entry['id']}").status_code == 200

    updated = client.patch(
        f"/api/v1/journal/{entry['id']}",
        json={
            "entry_date": "2026-11-18",
            "title": "An edited reflection",
            "content": "I updated this entry.",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["entry_date"] == "2026-11-18"
    assert updated.json()["title"] == "An edited reflection"
    assert updated.json()["content"] == "I updated this entry."

    deleted = client.delete(f"/api/v1/journal/{entry['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/journal/{entry['id']}").status_code == 404


def test_journal_rejects_empty_content_and_empty_updates(client: TestClient) -> None:
    payload = {"entry_date": "2026-11-19", "content": "   "}
    assert client.post("/api/v1/journal", json=payload).status_code == 422

    created = client.post(
        "/api/v1/journal",
        json={"entry_date": "2026-11-19", "content": "A valid entry."},
    )
    assert created.status_code == 201
    entry_id = created.json()["id"]
    assert client.patch(f"/api/v1/journal/{entry_id}", json={}).status_code == 422
    assert (
        client.patch(
            f"/api/v1/journal/{entry_id}",
            json={"content": "   "},
        ).status_code
        == 422
    )


def test_journal_entries_are_scoped_to_the_development_owner(client: TestClient) -> None:
    created = client.post(
        "/api/v1/journal",
        json={"entry_date": "2026-11-19", "content": "My private reflection."},
    )
    assert created.status_code == 201

    db_dependency = client.app.dependency_overrides[get_db]
    session_generator = db_dependency()
    session = next(session_generator)
    session.add(
        JournalEntry(
            owner_id=UUID("00000000-0000-4000-8000-000000000002"),
            entry_date=date(2026, 11, 19),
            content="Another owner's entry.",
        )
    )
    session.commit()
    try:
        listed = client.get("/api/v1/journal")
        assert listed.status_code == 200
        assert len(listed.json()) == 1
        assert listed.json()[0]["content"] == "My private reflection."
    finally:
        session_generator.close()
