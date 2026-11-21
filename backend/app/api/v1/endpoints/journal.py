from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.development import get_activity_owner_id
from app.db.session import get_db
from app.models import JournalEntry
from app.schemas.journal import JournalEntryCreate, JournalEntryRead, JournalEntryUpdate
from app.services.journal import (
    JournalEntryNotFoundError,
    get_owned_journal_entry,
    list_owned_journal_entries,
)


router = APIRouter(prefix="/journal", tags=["journal"])


@router.get("", response_model=list[JournalEntryRead])
def get_journal_entries(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> list[JournalEntry]:
    return list_owned_journal_entries(db, owner_id, limit, offset)


@router.post("", response_model=JournalEntryRead, status_code=status.HTTP_201_CREATED)
def create_journal_entry(
    payload: JournalEntryCreate,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> JournalEntry:
    entry = JournalEntry(owner_id=owner_id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{entry_id}", response_model=JournalEntryRead)
def get_journal_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> JournalEntry:
    try:
        return get_owned_journal_entry(db, entry_id, owner_id)
    except JournalEntryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found.",
        ) from exc


@router.patch("/{entry_id}", response_model=JournalEntryRead)
def update_journal_entry(
    entry_id: UUID,
    payload: JournalEntryUpdate,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> JournalEntry:
    try:
        entry = get_owned_journal_entry(db, entry_id, owner_id)
    except JournalEntryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found.",
        ) from exc

    updates = payload.model_dump(exclude_unset=True)
    for field in ("entry_date", "content"):
        if field in updates and updates[field] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Journal entry {field.replace('_', ' ')} cannot be null.",
            )

    for field, value in updates.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_journal_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
    owner_id: UUID = Depends(get_activity_owner_id),
) -> Response:
    try:
        entry = get_owned_journal_entry(db, entry_id, owner_id)
    except JournalEntryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found.",
        ) from exc

    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
