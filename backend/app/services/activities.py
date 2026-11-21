from datetime import datetime
from uuid import UUID

from sqlalchemy import or_, select, text
from sqlalchemy.orm import Session, selectinload

from app.models import Activity, ActivityCategory


class ActivityConflictError(Exception):
    pass


class ActivityNotFoundError(Exception):
    pass


class CategoryNotFoundError(Exception):
    pass


def lock_owner_activities(db: Session, owner_id: UUID) -> None:
    if db.get_bind().dialect.name == "postgresql":
        db.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:owner_id))"),
            {"owner_id": str(owner_id)},
        )


def get_category(db: Session, category_id: str, owner_id: UUID) -> ActivityCategory:
    category = db.scalar(
        select(ActivityCategory).where(
            ActivityCategory.id == category_id,
            or_(
                ActivityCategory.owner_id.is_(None),
                ActivityCategory.owner_id == owner_id,
            ),
        )
    )
    if category is None:
        raise CategoryNotFoundError
    return category


def get_owned_activity(db: Session, activity_id: UUID, owner_id: UUID) -> Activity:
    activity = db.scalar(
        select(Activity)
        .options(selectinload(Activity.category))
        .where(Activity.id == activity_id, Activity.owner_id == owner_id)
    )
    if activity is None:
        raise ActivityNotFoundError
    return activity


def get_active_activity(db: Session, owner_id: UUID) -> Activity | None:
    return db.scalar(
        select(Activity)
        .options(selectinload(Activity.category))
        .where(Activity.owner_id == owner_id, Activity.ended_at.is_(None))
    )


def ensure_no_overlap(
    db: Session,
    owner_id: UUID,
    started_at: datetime,
    ended_at: datetime,
    excluding_id: UUID | None = None,
) -> None:
    statement = select(Activity).where(
        Activity.owner_id == owner_id,
        Activity.started_at < ended_at,
        or_(Activity.ended_at.is_(None), Activity.ended_at > started_at),
    )
    if excluding_id is not None:
        statement = statement.where(Activity.id != excluding_id)

    if db.scalar(statement.limit(1)) is not None:
        raise ActivityConflictError("Activity time overlaps another recorded activity.")
