import type { Activity, ActivityCategory } from './types'
import { apiRequest } from '../../services/apiClient'
export { getErrorMessage } from '../../services/apiClient'

export const activityService = {
  getCategories: () => apiRequest<ActivityCategory[]>('/categories'),
  getForDate: (activityDate: string) =>
    apiRequest<Activity[]>(`/activities?activity_date=${encodeURIComponent(activityDate)}`),
  getHistory: (filters: {
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  } = {}) => {
    const params = new URLSearchParams()
    if (filters.startDate) params.set('start_date', filters.startDate)
    if (filters.endDate) params.set('end_date', filters.endDate)
    if (filters.limit !== undefined) params.set('limit', String(filters.limit))
    if (filters.offset !== undefined) params.set('offset', String(filters.offset))
    const query = params.toString()
    return apiRequest<Activity[]>(`/activities/history${query ? `?${query}` : ''}`)
  },
  getActive: () => apiRequest<Activity | null>('/activities/active'),
  create: (payload: {
    title: string
    category_id: string
    activity_date: string
    started_at: string
    ended_at: string
    notes: string | null
  }) =>
    apiRequest<Activity>('/activities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  start: (payload: {
    title: string
    category_id: string
    activity_date: string
  }) =>
    apiRequest<Activity>('/activities/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  stop: (id: string) =>
    apiRequest<Activity>(`/activities/${encodeURIComponent(id)}/stop`, {
      method: 'POST',
    }),
  update: (
    id: string,
    payload: Partial<{
      title: string
      category_id: string
      activity_date: string
      started_at: string
      ended_at: string
      notes: string | null
    }>,
  ) =>
    apiRequest<Activity>(`/activities/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/activities/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
