import { apiRequest } from '../../services/apiClient'
import type { Goal, GoalDraft } from './types'

export const goalService = {
  list: () => apiRequest<Goal[]>('/goals'),
  create: (payload: GoalDraft) =>
    apiRequest<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<GoalDraft>) =>
    apiRequest<Goal>(`/goals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/goals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
}
