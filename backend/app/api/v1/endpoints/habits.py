from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.development import get_activity_owner_id
from app.db.session import get_db
from app.models import Habit
from app.schemas.habit import HabitCreate, HabitProgressRead, HabitRead, HabitUpdate
from app.services.habits import (
    HabitProgress,
    HabitNotFoundError,
    delete_owned_habit,
    get_owned_habit,
    get_owned_habit_progress,
    list_owned_habit_progress,
    mark_habit_complete,
    remove_habit_completion,
)


router = APIRouter(prefix="/habits", tags=["habits"])


def progress_response(progress: HabitProgress) -> HabitProgressRead:
    return HabitProgressRead(
        id=progress.habit.id,
        name=progress.habit.name,
        description=progress.habit.description,
        created_at=progress.habit.created_at,
        updated_at=progress.habit.updated_at,
        is_completed=progress.is_completed,
        current_streak=progress.current_streak,
    )


@router.get("", response_model=list[HabitProgressRead])
def get_habits(
    habit_date: date = Query(...),
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> list[HabitProgressRead]:
    return [
        progress_response(progress)
        for progress in list_owned_habit_progress(db, owner_id, habit_date)
    ]


@router.post("", response_model=HabitRead, status_code=status.HTTP_201_CREATED)
def create_habit(
    payload: HabitCreate,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Habit:
    habit = Habit(owner_id=owner_id, **payload.model_dump())
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.get("/{habit_id}", response_model=HabitRead)
def get_habit(
    habit_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Habit:
    try:
        return get_owned_habit(db, habit_id, owner_id)
    except HabitNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found.",
        ) from exc


@router.patch("/{habit_id}", response_model=HabitRead)
def update_habit(
    habit_id: UUID,
    payload: HabitUpdate,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Habit:
    try:
        habit = get_owned_habit(db, habit_id, owner_id)
    except HabitNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found.",
        ) from exc

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Habit name cannot be null.",
        )
    for field, value in updates.items():
        setattr(habit, field, value)
    db.commit()
    db.refresh(habit)
    return habit


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit(
    habit_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Response:
    try:
        delete_owned_habit(db, habit_id, owner_id)
    except HabitNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found.",
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put(
    "/{habit_id}/completions/{completion_date}",
    response_model=HabitProgressRead,
)
def complete_habit(
    habit_id: UUID,
    completion_date: date,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> HabitProgressRead:
    try:
        mark_habit_complete(db, habit_id, owner_id, completion_date)
        progress = get_owned_habit_progress(db, habit_id, owner_id, completion_date)
    except HabitNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found.",
        ) from exc
    return progress_response(progress)


@router.delete(
    "/{habit_id}/completions/{completion_date}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def uncomplete_habit(
    habit_id: UUID,
    completion_date: date,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Response:
    try:
        remove_habit_completion(db, habit_id, owner_id, completion_date)
    except HabitNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found.",
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
