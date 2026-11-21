from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.models import CalendarEvent, CalendarReminder, InAppNotification
from app.schemas.calendar import CalendarEventCreate


class CalendarEventNotFoundError(Exception):
    pass


def get_owned_calendar_event(
    db: Session,
    event_id: UUID,
    owner_id: UUID,
) -> CalendarEvent:
    event = db.scalar(
        select(CalendarEvent)
        .options(selectinload(CalendarEvent.reminders))
        .where(CalendarEvent.id == event_id, CalendarEvent.owner_id == owner_id)
    )
    if event is None:
        raise CalendarEventNotFoundError
    return event


def save_calendar_event(
    db: Session,
    owner_id: UUID,
    payload: CalendarEventCreate,
    event: CalendarEvent | None = None,
) -> CalendarEvent:
    now = datetime.now(UTC)
    if event is None:
        event = CalendarEvent(owner_id=owner_id)
        db.add(event)
    else:
        old_reminder_ids = [reminder.id for reminder in event.reminders]
        if old_reminder_ids:
            db.execute(
                update(InAppNotification)
                .where(InAppNotification.reminder_id.in_(old_reminder_ids))
                .values(reminder_id=None)
            )
            db.flush()
        event.reminders.clear()
        db.flush()

    event.title = payload.title
    event.description = payload.description
    event.start_date = payload.start_date
    event.end_date = payload.end_date
    event.starts_at = payload.starts_at
    event.ends_at = payload.ends_at
    event.time_zone = payload.time_zone
    event.is_all_day = payload.is_all_day
    event.is_important = payload.is_important

    for reminder_input in payload.reminders:
        anchor = payload.starts_at if reminder_input.relative_to == "start" else payload.ends_at
        scheduled_at = anchor + timedelta(seconds=reminder_input.offset_seconds)
        db.add(
            CalendarReminder(
                event=event,
                relative_to=reminder_input.relative_to,
                offset_seconds=reminder_input.offset_seconds,
                scheduled_at=scheduled_at,
                status="pending" if scheduled_at > now else "missed",
            )
        )

    db.commit()
    return get_owned_calendar_event(db, event.id, owner_id)
