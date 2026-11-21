export type JournalEntry = {
  id: string
  entry_date: string
  title: string | null
  content: string
  created_at: string
  updated_at: string
}

export type JournalEntryDraft = {
  entry_date: string
  title: string | null
  content: string
}
