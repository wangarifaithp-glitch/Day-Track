from uuid import UUID

from fastapi import HTTPException, status

from app.core.config import get_settings


DEVELOPMENT_OWNER_ID = UUID("00000000-0000-4000-8000-000000000001")


def get_activity_owner_id() -> UUID:
    if get_settings().app_env != "development":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="This endpoint requires authentication outside development.",
        )
    return DEVELOPMENT_OWNER_ID
