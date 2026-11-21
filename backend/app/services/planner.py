from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import PlannedActivity


class PlannedActivityConflictError(Exception):
    pass


class PlannedActivityNotFoundError(Exception):
    pass


def get_owned_planned_activity(
    db: Session, planned_activity_id: UUID, owner_id: UUID
) -> PlannedActivity:
    planned_activity = db.scalar(
        select(PlannedActivity)
        .options(selectinload(PlannedActivity.category))
        .where(
            PlannedActivity.id == planned_activity_id,
            PlannedActivity.owner_id == owner_id,
        )
    )
    if planned_activity is None:
        raise PlannedActivityNotFoundError
    return planned_activity


def ensure_no_plan_overlap(
    db: Session,
    owner_id: UUID,
    starts_at: datetime,
    ends_at: datetime,
    excluding_id: UUID | None = None,
) -> None:
    statement = select(PlannedActivity).where(
        PlannedActivity.owner_id == owner_id,
        PlannedActivity.starts_at < ends_at,
        PlannedActivity.ends_at > starts_at,
    )
    if excluding_id is not None:
        statement = statement.where(PlannedActivity.id != excluding_id)

    if db.scalar(statement.limit(1)) is not None:
        raise PlannedActivityConflictError("Plan time overlaps another planned activity.")
