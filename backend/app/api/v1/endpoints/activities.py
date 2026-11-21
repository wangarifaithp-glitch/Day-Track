from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.development import get_activity_owner_id
from app.db.session import get_db
from app.models import Activity
from app.schemas.activity import ActivityCreate, ActivityRead, ActivityStart, ActivityUpdate
from app.services.activities import (
    ActivityConflictError,
    ActivityNotFoundError,
    CategoryNotFoundError,
    ensure_no_overlap,
    get_active_activity,
    get_category,
    get_owned_activity,
    lock_owner_activities,
)


router = APIRouter(prefix="/activities", tags=["activities"])


def _activity_conflict(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)


@router.get("", response_model=list[ActivityRead])
def list_activities_for_date(
    activity_date: date,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> list[Activity]:
    return list(
        db.scalars(
            select(Activity)
            .options(selectinload(Activity.category))
            .where(
                Activity.owner_id == owner_id,
                Activity.activity_date == activity_date,
            )
            .order_by(Activity.started_at)
        )
    )


@router.get("/history", response_model=list[ActivityRead])
def get_activity_history(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> list[Activity]:
    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Start date must be on or before end date.",
        )

    statement = (
        select(Activity)
        .options(selectinload(Activity.category))
        .where(Activity.owner_id == owner_id)
        .order_by(Activity.started_at.desc())
    )
    if start_date is not None:
        statement = statement.where(Activity.activity_date >= start_date)
    if end_date is not None:
        statement = statement.where(Activity.activity_date <= end_date)

    return list(
        db.scalars(statement.limit(limit).offset(offset))
    )


@router.get("/active", response_model=ActivityRead | None)
def get_current_activity(
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Activity | None:
    return get_active_activity(db, owner_id)


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def create_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Activity:
    if payload.ended_at <= payload.started_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End time must be after start time.",
        )

    try:
        lock_owner_activities(db, owner_id)
        get_category(db, payload.category_id, owner_id)
        ensure_no_overlap(db, owner_id, payload.started_at, payload.ended_at)
        activity = Activity(
            owner_id=owner_id,
            title=payload.title,
            category_id=payload.category_id,
            activity_date=payload.activity_date,
            started_at=payload.started_at,
            ended_at=payload.ended_at,
            notes=payload.notes,
        )
        db.add(activity)
        db.commit()
        return get_owned_activity(db, activity.id, owner_id)
    except CategoryNotFoundError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    except ActivityConflictError as exc:
        db.rollback()
        raise _activity_conflict(str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise _activity_conflict("Activity conflicts with an existing activity.") from exc


@router.post("/start", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def start_activity(
    payload: ActivityStart,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Activity:
    try:
        lock_owner_activities(db, owner_id)
        if get_active_activity(db, owner_id) is not None:
            raise ActivityConflictError("An activity is already running.")
        get_category(db, payload.category_id, owner_id)
        started_at = datetime.now(UTC)
        ensure_no_overlap(
            db, owner_id, started_at, started_at + timedelta(microseconds=1)
        )
        activity = Activity(
            owner_id=owner_id,
            title=payload.title,
            category_id=payload.category_id,
            activity_date=payload.activity_date,
            started_at=started_at,
            notes=payload.notes,
        )
        db.add(activity)
        db.commit()
        return get_owned_activity(db, activity.id, owner_id)
    except CategoryNotFoundError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    except ActivityConflictError as exc:
        db.rollback()
        raise _activity_conflict(str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise _activity_conflict("An activity is already running or overlaps an existing activity.") from exc


@router.get("/{activity_id}", response_model=ActivityRead)
def get_activity(
    activity_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Activity:
    try:
        return get_owned_activity(db, activity_id, owner_id)
    except ActivityNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.") from exc


@router.post("/{activity_id}/stop", response_model=ActivityRead)
def stop_activity(
    activity_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Activity:
    try:
        lock_owner_activities(db, owner_id)
        activity = get_owned_activity(db, activity_id, owner_id)
        if activity.ended_at is not None:
            raise ActivityConflictError("This activity is already stopped.")
        ended_at = datetime.now(UTC)
        if ended_at <= activity.started_at:
            ended_at = activity.started_at + timedelta(microseconds=1)
        ensure_no_overlap(db, owner_id, activity.started_at, ended_at, excluding_id=activity.id)
        activity.ended_at = ended_at
        activity.updated_at = ended_at
        db.commit()
        return get_owned_activity(db, activity.id, owner_id)
    except ActivityNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.") from exc
    except ActivityConflictError as exc:
        db.rollback()
        raise _activity_conflict(str(exc)) from exc


@router.patch("/{activity_id}", response_model=ActivityRead)
def update_activity(
    activity_id: UUID,
    payload: ActivityUpdate,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Activity:
    try:
        lock_owner_activities(db, owner_id)
        activity = get_owned_activity(db, activity_id, owner_id)
        if activity.is_active:
            raise ActivityConflictError("Stop the activity before editing it.")

        updates = payload.model_dump(exclude_unset=True)
        non_nullable_fields = {
            "title",
            "category_id",
            "activity_date",
            "started_at",
            "ended_at",
        }
        if any(
            updates[field] is None
            for field in non_nullable_fields.intersection(updates)
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Activity fields cannot be null.",
            )
        if "category_id" in updates:
            get_category(db, updates["category_id"], owner_id)
        started_at = updates.get("started_at", activity.started_at)
        ended_at = updates.get("ended_at", activity.ended_at)
        if started_at is None or ended_at is None or ended_at <= started_at:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="End time must be after start time.",
            )
        ensure_no_overlap(
            db, owner_id, started_at, ended_at, excluding_id=activity.id
        )
        for field, value in updates.items():
            setattr(activity, field, value)
        activity.updated_at = datetime.now(UTC)
        db.commit()
        return get_owned_activity(db, activity.id, owner_id)
    except ActivityNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.") from exc
    except CategoryNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.") from exc
    except ActivityConflictError as exc:
        db.rollback()
        raise _activity_conflict(str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise _activity_conflict("Activity conflicts with an existing activity.") from exc


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Response:
    try:
        activity = get_owned_activity(db, activity_id, owner_id)
        db.delete(activity)
        db.commit()
    except ActivityNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.") from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
