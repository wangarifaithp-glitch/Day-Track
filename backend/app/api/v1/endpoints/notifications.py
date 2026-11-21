from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.development import get_activity_owner_id
from app.db.session import get_db
from app.models import InAppNotification, PushSubscription
from app.schemas.calendar import (
    NotificationRead,
    PushSubscriptionCreate,
    PushSubscriptionDelete,
    PushSubscriptionRead,
)


router = APIRouter(prefix="/notifications", tags=["notifications"])


def _push_is_configured() -> bool:
    settings = get_settings()
    return bool(
        settings.vapid_public_key
        and settings.vapid_private_key_file
        and settings.vapid_private_key_file.is_file()
    )


@router.get("/push/public-key")
def get_push_public_key() -> dict[str, str | bool | None]:
    settings = get_settings()
    enabled = _push_is_configured()
    return {
        "enabled": enabled,
        "public_key": settings.vapid_public_key if enabled else None,
    }


@router.post(
    "/push-subscriptions",
    response_model=PushSubscriptionRead,
    status_code=status.HTTP_201_CREATED,
)
def save_push_subscription(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> PushSubscription:
    if not _push_is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web Push is not configured on this server.",
        )

    endpoint = str(payload.endpoint)
    subscription = db.scalar(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    )
    if subscription is not None and subscription.owner_id != owner_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subscription is already in use.")
    if subscription is None:
        subscription = PushSubscription(owner_id=owner_id, endpoint=endpoint)
        db.add(subscription)
    subscription.p256dh_key = payload.keys.p256dh
    subscription.auth_key = payload.keys.auth
    db.commit()
    db.refresh(subscription)
    return subscription


@router.delete("/push-subscriptions", status_code=status.HTTP_204_NO_CONTENT)
def delete_push_subscription(
    endpoint: str = Query(min_length=10, max_length=2048),
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Response:
    subscription = db.scalar(
        select(PushSubscription).where(
            PushSubscription.endpoint == endpoint,
            PushSubscription.owner_id == owner_id,
        )
    )
    if subscription is not None:
        db.delete(subscription)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("", response_model=list[NotificationRead])
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> list[InAppNotification]:
    statement = select(InAppNotification).where(InAppNotification.owner_id == owner_id)
    if unread_only:
        statement = statement.where(InAppNotification.read_at.is_(None))
    return list(
        db.scalars(
            statement.order_by(InAppNotification.created_at.desc()).limit(limit)
        )
    )


@router.post("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> InAppNotification:
    notification = db.scalar(
        select(InAppNotification).where(
            InAppNotification.id == notification_id,
            InAppNotification.owner_id == owner_id,
        )
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    notification.read_at = datetime.now(UTC)
    db.commit()
    db.refresh(notification)
    return notification
