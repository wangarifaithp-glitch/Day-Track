from collections.abc import Generator
from datetime import UTC, date, datetime
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.development import DEVELOPMENT_OWNER_ID, get_activity_owner_id
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import ActivityCategory


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_sessions = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)

    def override_db() -> Generator[Session, None, None]:
        with test_sessions() as session:
            yield session

    def override_owner_id() -> UUID:
        return DEVELOPMENT_OWNER_ID

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_activity_owner_id] = override_owner_id
    with test_sessions() as session:
        session.add_all(
            [
                ActivityCategory(
                    id="learning",
                    name="Learning",
                    color="#60A5FA",
                    icon="book-open",
                    is_default=True,
                ),
                ActivityCategory(
                    id="work",
                    name="Work",
                    color="#4F9B7A",
                    icon="briefcase",
                    is_default=True,
                ),
                ActivityCategory(
                    id="transport-commuting",
                    name="Transport & Commuting",
                    color="#457B9D",
                    icon="car-front",
                    is_default=True,
                ),
                ActivityCategory(
                    id="errands-shopping",
                    name="Errands & Shopping",
                    color="#B77822",
                    icon="shopping-bag",
                    is_default=True,
                ),
                ActivityCategory(
                    id="finance-admin",
                    name="Finance & Administration",
                    color="#58677C",
                    icon="wallet",
                    is_default=True,
                ),
                ActivityCategory(
                    id="creative-hobbies",
                    name="Creative Hobbies",
                    color="#C25B46",
                    icon="palette",
                    is_default=True,
                ),
                ActivityCategory(
                    id="pet-care",
                    name="Pet Care",
                    color="#5D8B42",
                    icon="paw-print",
                    is_default=True,
                ),
                ActivityCategory(
                    id="travel-exploration",
                    name="Travel & Exploration",
                    color="#23827A",
                    icon="plane",
                    is_default=True,
                ),
                ActivityCategory(
                    id="volunteering-community",
                    name="Volunteering & Community",
                    color="#A64F79",
                    icon="hand-heart",
                    is_default=True,
                ),
                ActivityCategory(
                    id="caregiving",
                    name="Caregiving",
                    color="#7655A4",
                    icon="heart-handshake",
                    is_default=True,
                ),
                ActivityCategory(
                    id="gardening-outdoors",
                    name="Gardening & Outdoor Time",
                    color="#568550",
                    icon="sprout",
                    is_default=True,
                ),
                ActivityCategory(
                    id="medical-appointments",
                    name="Medical Appointments",
                    color="#C44D5C",
                    icon="stethoscope",
                    is_default=True,
                ),
                ActivityCategory(
                    id="home-projects",
                    name="Home Projects & Repairs",
                    color="#A56C48",
                    icon="hammer",
                    is_default=True,
                ),
                ActivityCategory(
                    id="professional-development",
                    name="Professional Development",
                    color="#416BA8",
                    icon="graduation-cap",
                    is_default=True,
                ),
                ActivityCategory(
                    id="digital-administration",
                    name="Digital Administration",
                    color="#487A86",
                    icon="monitor-cog",
                    is_default=True,
                ),
                ActivityCategory(
                    id="rest-recovery",
                    name="Rest & Recovery",
                    color="#6D64A7",
                    icon="bed",
                    is_default=True,
                ),
                ActivityCategory(
                    id="events-culture",
                    name="Events & Culture",
                    color="#B04E83",
                    icon="ticket",
                    is_default=True,
                ),
                ActivityCategory(
                    id="childcare-school-runs",
                    name="Childcare & School Runs",
                    color="#B7673D",
                    icon="baby",
                    is_default=True,
                ),
                ActivityCategory(
                    id="private-custom",
                    name="Private custom category",
                    color="#123456",
                    icon="lock",
                    is_default=False,
                    owner_id=UUID("00000000-0000-4000-8000-000000000002"),
                ),
            ]
        )
        session.commit()

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
def activity_payload() -> dict[str, object]:
    return {
        "title": "Read a chapter",
        "category_id": "learning",
        "activity_date": date(2026, 11, 18).isoformat(),
        "started_at": datetime(2026, 11, 18, 8, 0, tzinfo=UTC).isoformat(),
        "ended_at": datetime(2026, 11, 18, 8, 45, tzinfo=UTC).isoformat(),
        "notes": "Deep focus",
    }
