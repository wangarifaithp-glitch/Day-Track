from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import AUTH_COOKIE_NAME, decode_access_token
from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User


DEVELOPMENT_OWNER_ID = UUID("00000000-0000-4000-8000-000000000001")


def get_activity_owner_id(
    session_token: str | None = Cookie(default=None, alias=AUTH_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> UUID:
    if get_settings().app_env == "development" and session_token is None:
        return DEVELOPMENT_OWNER_ID

    if session_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to continue.",
        )

    user_id, token_version = decode_access_token(session_token)
    user = db.get(User, user_id)
    if user is None or not user.is_verified or user.token_version != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or has expired. Please sign in again.",
        )
    return user.id
