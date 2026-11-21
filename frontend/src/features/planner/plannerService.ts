import { apiRequest } from '../../services/apiClient'
import type { PlannedActivity } from './types'

export const plannerService = {
  getForDate: (planDate: string) =>
    apiRequest<PlannedActivity[]>(`/planner?plan_date=${encodeURIComponent(planDate)}`),
  create: (payload: {
    title: string
    category_id: string
    plan_date: string
    starts_at: string
    ends_at: string
    notes: string | null
  }) =>
    apiRequest<PlannedActivity>('/planner', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (
    id: string,
    payload: Partial<{
      title: string
      category_id: string
      plan_date: string
      starts_at: string
      ends_at: string
      notes: string | null
    }>,
  ) =>
    apiRequest<PlannedActivity>(`/planner/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/planner/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
