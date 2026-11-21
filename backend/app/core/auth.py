from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User

password_hash = PasswordHash.recommended()
AUTH_COOKIE_NAME = "daytrack_session"


def _secret_key() -> str:
    secret = get_settings().auth_secret_key
    if len(secret) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured on the server.",
        )
    return secret


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user: User) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user.id),
            "ver": user.token_version,
            "iat": now,
            "exp": now + timedelta(hours=12),
        },
        _secret_key(),
        algorithm="HS256",
    )


def decode_access_token(token: str) -> tuple[UUID, int]:
    try:
        payload = jwt.decode(token, _secret_key(), algorithms=["HS256"])
        subject = payload.get("sub")
        version = payload.get("ver")
        if not isinstance(subject, str) or not isinstance(version, int):
            raise ValueError("Invalid token claims.")
        return UUID(subject), version
    except (jwt.InvalidTokenError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or has expired. Please sign in again.",
        ) from error


def get_authenticated_user(
    session_token: str | None = Cookie(default=None, alias=AUTH_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User:
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
    return user
