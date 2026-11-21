from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Habit, HabitCompletion


class HabitNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class HabitProgress:
    habit: Habit
    is_completed: bool
    current_streak: int


def list_owned_habits(db: Session, owner_id: UUID) -> list[Habit]:
    return list(
        db.scalars(
            select(Habit)
            .where(Habit.owner_id == owner_id)
            .order_by(Habit.created_at, Habit.name)
        )
    )


def get_owned_habit(db: Session, habit_id: UUID, owner_id: UUID) -> Habit:
    habit = db.scalar(
        select(Habit).where(Habit.id == habit_id, Habit.owner_id == owner_id)
    )
    if habit is None:
        raise HabitNotFoundError
    return habit


def _streak_for_date(completed_dates: set[date], as_of: date) -> int:
    cursor = as_of if as_of in completed_dates else as_of - timedelta(days=1)
    streak = 0
    while cursor in completed_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def list_owned_habit_progress(
    db: Session,
    owner_id: UUID,
    habit_date: date,
) -> list[HabitProgress]:
    habits = list_owned_habits(db, owner_id)
    if not habits:
        return []

    habit_ids = [habit.id for habit in habits]
    completion_rows = db.execute(
        select(HabitCompletion.habit_id, HabitCompletion.completion_date)
        .where(
            HabitCompletion.owner_id == owner_id,
            HabitCompletion.habit_id.in_(habit_ids),
            HabitCompletion.completion_date <= habit_date,
        )
        .order_by(HabitCompletion.completion_date.desc())
    ).all()
    dates_by_habit: dict[UUID, set[date]] = defaultdict(set)
    for habit_id, completion_date in completion_rows:
        dates_by_habit[habit_id].add(completion_date)

    return [
        HabitProgress(
            habit=habit,
            is_completed=habit_date in dates_by_habit[habit.id],
            current_streak=_streak_for_date(dates_by_habit[habit.id], habit_date),
        )
        for habit in habits
    ]


def get_owned_habit_progress(
    db: Session,
    habit_id: UUID,
    owner_id: UUID,
    habit_date: date,
) -> HabitProgress:
    habit = get_owned_habit(db, habit_id, owner_id)
    completed_dates = set(
        db.scalars(
            select(HabitCompletion.completion_date).where(
                HabitCompletion.habit_id == habit_id,
                HabitCompletion.owner_id == owner_id,
                HabitCompletion.completion_date <= habit_date,
            )
        )
    )
    return HabitProgress(
        habit=habit,
        is_completed=habit_date in completed_dates,
        current_streak=_streak_for_date(completed_dates, habit_date),
    )


def mark_habit_complete(
    db: Session,
    habit_id: UUID,
    owner_id: UUID,
    completion_date: date,
) -> None:
    get_owned_habit(db, habit_id, owner_id)
    completion = db.scalar(
        select(HabitCompletion).where(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.owner_id == owner_id,
            HabitCompletion.completion_date == completion_date,
        )
    )
    if completion is None:
        db.add(
            HabitCompletion(
                habit_id=habit_id,
                owner_id=owner_id,
                completion_date=completion_date,
            )
        )
        db.commit()


def remove_habit_completion(
    db: Session,
    habit_id: UUID,
    owner_id: UUID,
    completion_date: date,
) -> None:
    get_owned_habit(db, habit_id, owner_id)
    completion = db.scalar(
        select(HabitCompletion).where(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.owner_id == owner_id,
            HabitCompletion.completion_date == completion_date,
        )
    )
    if completion is not None:
        db.delete(completion)
        db.commit()


def delete_owned_habit(db: Session, habit_id: UUID, owner_id: UUID) -> None:
    habit = get_owned_habit(db, habit_id, owner_id)
    db.execute(
        delete(HabitCompletion).where(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.owner_id == owner_id,
        )
    )
    db.delete(habit)
    db.commit()
