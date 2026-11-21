from datetime import UTC, datetime, timedelta
import hashlib
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import (
    AUTH_COOKIE_NAME,
    _secret_key,
    create_access_token,
    get_authenticated_user,
    hash_password,
    verify_password,
)
from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import AuthToken, User
from app.schemas.auth import (
    EmailRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenRequest,
    UserRead,
)
from app.services.auth_email import require_email_configuration, send_email


router = APIRouter(prefix="/auth", tags=["authentication"])
_DUMMY_PASSWORD_HASH = hash_password("invalid-login-timing-protection")


def _public_user(user: User) -> UserRead:
    return UserRead(
        id=str(user.id),
        email=user.email,
        name=user.name,
        is_verified=user.is_verified,
    )


def _frontend_action_url(path: str, token: str) -> str:
    base_url = get_settings().app_base_url.rstrip("/")
    return f"{base_url}/#/{path.lstrip('/')}?{urlencode({'token': token})}"


def _issue_action_token(
    db: Session,
    user: User,
    purpose: str,
    lifetime: timedelta,
) -> str:
    now = datetime.now(UTC)
    db.execute(
        AuthToken.__table__.update()
        .where(
            AuthToken.user_id == user.id,
            AuthToken.purpose == purpose,
            AuthToken.used_at.is_(None),
        )
        .values(used_at=now)
    )
    raw_token = secrets.token_urlsafe(32)
    db.add(
        AuthToken(
            user_id=user.id,
            token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
            purpose=purpose,
            expires_at=now + lifetime,
        )
    )
    db.commit()
    return raw_token


def _consume_action_token(
    db: Session,
    raw_token: str,
    purpose: str,
) -> tuple[AuthToken, User]:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    token = db.scalar(
        select(AuthToken)
        .where(
            AuthToken.token_hash == token_hash,
            AuthToken.purpose == purpose,
            AuthToken.used_at.is_(None),
            AuthToken.expires_at > datetime.now(UTC),
        )
        .with_for_update()
    )
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This link is invalid or has expired. Request a new one.",
        )
    user = db.get(User, token.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This link is invalid or has expired. Request a new one.",
        )
    token.used_at = datetime.now(UTC)
    return token, user


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> MessageResponse:
    _secret_key()
    require_email_configuration()
    user = User(
        email=str(payload.email),
        name=payload.name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Try signing in.",
        ) from error

    token = _issue_action_token(db, user, "verify_email", timedelta(hours=24))
    verify_url = _frontend_action_url("verify-email", token)
    send_email(
        user.email,
        "Verify your DAYTRACK account",
        f"Hi {user.name},\n\nVerify your email address using this link:\n{verify_url}\n\n"
        "This link expires in 24 hours. If you did not create this account, ignore this email.",
    )
    return MessageResponse(message="Check your email for a verification link.")


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: TokenRequest, db: Session = Depends(get_db)) -> MessageResponse:
    _, user = _consume_action_token(db, payload.token, "verify_email")
    user.is_verified = True
    db.commit()
    return MessageResponse(message="Your email is verified. You can now sign in.")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(
    payload: EmailRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    _secret_key()
    require_email_configuration()
    user = db.scalar(select(User).where(User.email == str(payload.email)))
    if user is not None and not user.is_verified:
        token = _issue_action_token(db, user, "verify_email", timedelta(hours=24))
        verify_url = _frontend_action_url("verify-email", token)
        send_email(
            user.email,
            "Verify your DAYTRACK account",
            f"Hi {user.name},\n\nVerify your email address using this link:\n{verify_url}\n\n"
            "This link expires in 24 hours.",
        )
    return MessageResponse(message="If that account needs verification, an email has been sent.")


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == str(payload.email)))
    if user is None:
        verify_password(payload.password, _DUMMY_PASSWORD_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verify your email before signing in.",
        )
    settings = get_settings()
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=create_access_token(user),
        max_age=12 * 60 * 60,
        httponly=True,
        secure=settings.app_env != "development",
        samesite="none" if settings.app_env != "development" else "lax",
        path="/",
    )
    return LoginResponse(user=_public_user(user))


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    user.token_version += 1
    db.commit()
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        path="/",
        secure=get_settings().app_env != "development",
        samesite="none" if get_settings().app_env != "development" else "lax",
    )
    return MessageResponse(message="You have been signed out.")


@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    payload: EmailRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    _secret_key()
    require_email_configuration()
    user = db.scalar(select(User).where(User.email == str(payload.email)))
    if user is not None and user.is_verified:
        token = _issue_action_token(db, user, "reset_password", timedelta(hours=1))
        reset_url = _frontend_action_url("reset-password", token)
        send_email(
            user.email,
            "Reset your DAYTRACK password",
            f"Use this link to set a new password:\n{reset_url}\n\n"
            "This link expires in one hour. If you did not request this, ignore this email.",
        )
    return MessageResponse(message="If an account exists for that email, a reset link has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    _, user = _consume_action_token(db, payload.token, "reset_password")
    user.password_hash = hash_password(payload.password)
    user.token_version += 1
    db.commit()
    return MessageResponse(message="Your password has been updated. Sign in with your new password.")


@router.get("/me", response_model=UserRead)
def read_current_user(user: User = Depends(get_authenticated_user)) -> UserRead:
    return _public_user(user)
