from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.development import get_activity_owner_id
from app.db.session import get_db
from app.models import ActivityCategory
from app.schemas.activity import ActivityCategoryRead


router = APIRouter(prefix="/categories", tags=["activity categories"])


@router.get("", response_model=list[ActivityCategoryRead])
def list_categories(
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> list[ActivityCategory]:
    return list(
        db.scalars(
            select(ActivityCategory)
            .where(
                or_(
                    ActivityCategory.owner_id.is_(None),
                    ActivityCategory.owner_id == owner_id,
                )
            )
            .order_by(ActivityCategory.is_default.desc(), ActivityCategory.name)
        )
    )
