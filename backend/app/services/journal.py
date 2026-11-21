from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import JournalEntry


class JournalEntryNotFoundError(Exception):
    pass


def list_owned_journal_entries(
    db: Session,
    owner_id: UUID,
    limit: int,
    offset: int,
) -> list[JournalEntry]:
    return list(
        db.scalars(
            select(JournalEntry)
            .where(JournalEntry.owner_id == owner_id)
            .order_by(
                JournalEntry.entry_date.desc(),
                JournalEntry.updated_at.desc(),
                JournalEntry.id,
            )
            .limit(limit)
            .offset(offset)
        )
    )


def get_owned_journal_entry(
    db: Session,
    entry_id: UUID,
    owner_id: UUID,
) -> JournalEntry:
    entry = db.scalar(
        select(JournalEntry).where(
            JournalEntry.id == entry_id,
            JournalEntry.owner_id == owner_id,
        )
    )
    if entry is None:
        raise JournalEntryNotFoundError
    return entry
