import { apiRequest } from '../../services/apiClient'
import type { Habit, HabitDraft, HabitProgress } from './types'

export const habitService = {
  list: (habitDate: string) =>
    apiRequest<HabitProgress[]>(`/habits?habit_date=${encodeURIComponent(habitDate)}`),
  create: (payload: HabitDraft) =>
    apiRequest<Habit>('/habits', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: HabitDraft) =>
    apiRequest<Habit>(`/habits/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/habits/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  markComplete: (id: string, completionDate: string) =>
    apiRequest<HabitProgress>(
      `/habits/${encodeURIComponent(id)}/completions/${encodeURIComponent(completionDate)}`,
      { method: 'PUT' },
    ),
  clearCompletion: (id: string, completionDate: string) =>
    apiRequest<void>(
      `/habits/${encodeURIComponent(id)}/completions/${encodeURIComponent(completionDate)}`,
      { method: 'DELETE' },
    ),
}
