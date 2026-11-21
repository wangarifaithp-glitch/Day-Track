import { apiRequest } from '../../services/apiClient'
import type { CalendarEvent, CalendarEventDraft } from './types'

export const calendarService = {
  getForRange: (startDate: string, endDate: string) =>
    apiRequest<CalendarEvent[]>(
      `/calendar/events?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
    ),
  create: (payload: CalendarEventDraft) =>
    apiRequest<CalendarEvent>('/calendar/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: CalendarEventDraft) =>
    apiRequest<CalendarEvent>(`/calendar/events/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/calendar/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
}
