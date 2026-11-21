from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.core.development import get_activity_owner_id
from app.db.session import get_db
from app.models import CalendarEvent, InAppNotification
from app.schemas.calendar import CalendarEventCreate, CalendarEventRead
from app.services.calendar import (
    CalendarEventNotFoundError,
    get_owned_calendar_event,
    save_calendar_event,
)


router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/events", response_model=list[CalendarEventRead])
def list_calendar_events(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> list[CalendarEvent]:
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End date must be on or after start date.",
        )
    return list(
        db.scalars(
            select(CalendarEvent)
            .options(selectinload(CalendarEvent.reminders))
            .where(
                CalendarEvent.owner_id == owner_id,
                CalendarEvent.start_date <= end_date,
                CalendarEvent.end_date >= start_date,
            )
            .order_by(CalendarEvent.start_date, CalendarEvent.starts_at)
        )
    )


@router.post(
    "/events",
    response_model=CalendarEventRead,
    status_code=status.HTTP_201_CREATED,
)
def create_calendar_event(
    payload: CalendarEventCreate,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> CalendarEvent:
    return save_calendar_event(db, owner_id, payload)


@router.get("/events/{event_id}", response_model=CalendarEventRead)
def get_calendar_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> CalendarEvent:
    try:
        return get_owned_calendar_event(db, event_id, owner_id)
    except CalendarEventNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.") from exc


@router.put("/events/{event_id}", response_model=CalendarEventRead)
def replace_calendar_event(
    event_id: UUID,
    payload: CalendarEventCreate,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> CalendarEvent:
    try:
        event = get_owned_calendar_event(db, event_id, owner_id)
        return save_calendar_event(db, owner_id, payload, event)
    except CalendarEventNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.") from exc


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calendar_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Response:
    try:
        event = get_owned_calendar_event(db, event_id, owner_id)
    except CalendarEventNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.") from exc

    db.execute(
        update(InAppNotification)
        .where(InAppNotification.event_id == event.id)
        .values(event_id=None, reminder_id=None)
    )
    db.delete(event)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
