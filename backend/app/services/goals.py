from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Goal


class GoalNotFoundError(Exception):
    pass


def list_owned_goals(db: Session, owner_id: UUID) -> list[Goal]:
    return list(
        db.scalars(
            select(Goal)
            .where(Goal.owner_id == owner_id)
            .order_by(Goal.created_at.desc())
        )
    )


def get_owned_goal(db: Session, goal_id: UUID, owner_id: UUID) -> Goal:
    goal = db.scalar(
        select(Goal).where(Goal.id == goal_id, Goal.owner_id == owner_id)
    )
    if goal is None:
        raise GoalNotFoundError
    return goal
