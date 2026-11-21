from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.development import get_activity_owner_id
from app.db.session import get_db
from app.models import PlannedActivity
from app.schemas.planner import (
    PlannedActivityCreate,
    PlannedActivityRead,
    PlannedActivityUpdate,
)
from app.services.activities import (
    CategoryNotFoundError,
    get_category,
    lock_owner_activities,
)
from app.services.planner import (
    PlannedActivityConflictError,
    PlannedActivityNotFoundError,
    ensure_no_plan_overlap,
    get_owned_planned_activity,
)


router = APIRouter(prefix="/planner", tags=["planner"])


def _plan_conflict(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)


@router.get("", response_model=list[PlannedActivityRead])
def list_planned_activities(
    plan_date: date,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> list[PlannedActivity]:
    return list(
        db.scalars(
            select(PlannedActivity)
            .options(selectinload(PlannedActivity.category))
            .where(
                PlannedActivity.owner_id == owner_id,
                PlannedActivity.plan_date == plan_date,
            )
            .order_by(PlannedActivity.starts_at)
        )
    )


@router.post("", response_model=PlannedActivityRead, status_code=status.HTTP_201_CREATED)
def create_planned_activity(
    payload: PlannedActivityCreate,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> PlannedActivity:
    if payload.ends_at <= payload.starts_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Planned end time must be after start time.",
        )

    try:
        lock_owner_activities(db, owner_id)
        get_category(db, payload.category_id, owner_id)
        ensure_no_plan_overlap(db, owner_id, payload.starts_at, payload.ends_at)
        planned_activity = PlannedActivity(
            owner_id=owner_id,
            title=payload.title,
            category_id=payload.category_id,
            plan_date=payload.plan_date,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            notes=payload.notes,
        )
        db.add(planned_activity)
        db.commit()
        return get_owned_planned_activity(db, planned_activity.id, owner_id)
    except CategoryNotFoundError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    except PlannedActivityConflictError as exc:
        db.rollback()
        raise _plan_conflict(str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise _plan_conflict("Planned activity conflicts with an existing plan.") from exc


@router.get("/{planned_activity_id}", response_model=PlannedActivityRead)
def get_planned_activity(
    planned_activity_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> PlannedActivity:
    try:
        return get_owned_planned_activity(db, planned_activity_id, owner_id)
    except PlannedActivityNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Planned activity not found."
        ) from exc


@router.patch("/{planned_activity_id}", response_model=PlannedActivityRead)
def update_planned_activity(
    planned_activity_id: UUID,
    payload: PlannedActivityUpdate,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> PlannedActivity:
    try:
        lock_owner_activities(db, owner_id)
        planned_activity = get_owned_planned_activity(db, planned_activity_id, owner_id)
        updates = payload.model_dump(exclude_unset=True)
        non_nullable_fields = {
            "title",
            "category_id",
            "plan_date",
            "starts_at",
            "ends_at",
        }
        if any(
            updates[field] is None
            for field in non_nullable_fields.intersection(updates)
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Planned activity fields cannot be null.",
            )
        if "category_id" in updates:
            get_category(db, updates["category_id"], owner_id)

        starts_at = updates.get("starts_at", planned_activity.starts_at)
        ends_at = updates.get("ends_at", planned_activity.ends_at)
        if ends_at <= starts_at:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Planned end time must be after start time.",
            )
        ensure_no_plan_overlap(
            db,
            owner_id,
            starts_at,
            ends_at,
            excluding_id=planned_activity.id,
        )
        for field, value in updates.items():
            setattr(planned_activity, field, value)
        db.commit()
        return get_owned_planned_activity(db, planned_activity.id, owner_id)
    except PlannedActivityNotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Planned activity not found."
        ) from exc
    except CategoryNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.") from exc
    except PlannedActivityConflictError as exc:
        db.rollback()
        raise _plan_conflict(str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise _plan_conflict("Planned activity conflicts with an existing plan.") from exc


@router.delete("/{planned_activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_planned_activity(
    planned_activity_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Response:
    try:
        planned_activity = get_owned_planned_activity(db, planned_activity_id, owner_id)
        db.delete(planned_activity)
        db.commit()
    except PlannedActivityNotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Planned activity not found."
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
