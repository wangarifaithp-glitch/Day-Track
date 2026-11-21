import { apiRequest } from '../../services/apiClient'
import type { JournalEntry, JournalEntryDraft } from './types'

export const journalService = {
  list: (limit = 100, offset = 0) =>
    apiRequest<JournalEntry[]>(`/journal?limit=${limit}&offset=${offset}`),
  create: (payload: JournalEntryDraft) =>
    apiRequest<JournalEntry>('/journal', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: JournalEntryDraft) =>
    apiRequest<JournalEntry>(`/journal/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/journal/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
}
