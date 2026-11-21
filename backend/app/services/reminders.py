import asyncio
import json
import logging
from datetime import UTC, datetime

from pywebpush import WebPushException, webpush
from requests.exceptions import RequestException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import CalendarReminder, InAppNotification, PushSubscription


logger = logging.getLogger(__name__)


def _reminder_body(reminder: CalendarReminder) -> str:
    event = reminder.event
    if reminder.relative_to == "start":
        if reminder.offset_seconds < 0:
            return f"{event.title} is coming up."
        return f"{event.title} is starting now."
    if reminder.offset_seconds == 0:
        return f"{event.title} is scheduled to end now."
    return f"Follow up on {event.title}."


def dispatch_due_reminders(db: Session, now: datetime | None = None) -> int:
    current_time = now or datetime.now(UTC)
    due_reminders = list(
        db.scalars(
            select(CalendarReminder)
            .options(selectinload(CalendarReminder.event))
            .where(
                CalendarReminder.status == "pending",
                CalendarReminder.scheduled_at <= current_time,
            )
            .order_by(CalendarReminder.scheduled_at)
            .limit(100)
            .with_for_update(skip_locked=True)
        )
    )
    if not due_reminders:
        return 0

    push_jobs: list[tuple[PushSubscription, dict[str, str]]] = []
    settings = get_settings()
    for reminder in due_reminders:
        event = reminder.event
        reminder.status = "sent"
        reminder.sent_at = current_time
        notification = InAppNotification(
            owner_id=event.owner_id,
            event_id=event.id,
            reminder_id=reminder.id,
            title=event.title,
            body=_reminder_body(reminder),
            url=f"/calendar?date={event.start_date.isoformat()}",
            created_at=current_time,
        )
        db.add(notification)
        if settings.vapid_private_key_file and settings.vapid_public_key:
            subscriptions = db.scalars(
                select(PushSubscription).where(PushSubscription.owner_id == event.owner_id)
            )
            payload = {
                "title": event.title,
                "body": notification.body,
                "url": notification.url,
            }
            push_jobs.extend((subscription, payload) for subscription in subscriptions)

    db.commit()

    for subscription, payload in push_jobs:
        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh_key,
                "auth": subscription.auth_key,
            },
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=str(settings.vapid_private_key_file),
                vapid_claims={"sub": settings.vapid_subject},
            )
        except WebPushException as exc:
            status_code = exc.response.status_code if exc.response is not None else None
            logger.warning("Web Push delivery failed with status %s.", status_code)
            if status_code in (404, 410):
                db.delete(subscription)
                db.commit()
        except RequestException:
            logger.exception("Web Push delivery failed due to a network error.")
    return len(due_reminders)


def run_reminder_dispatch() -> int:
    with SessionLocal() as db:
        return dispatch_due_reminders(db)


async def reminder_worker() -> None:
    settings = get_settings()
    while True:
        await asyncio.sleep(settings.reminder_poll_seconds)
        try:
            await asyncio.to_thread(run_reminder_dispatch)
        except (SQLAlchemyError, OSError):
            logger.exception("Calendar reminder dispatch failed.")
