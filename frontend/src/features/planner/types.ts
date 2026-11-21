import type { ActivityCategory } from '../activities/types'

export type PlannedActivity = {
  id: string
  title: string
  category_id: string
  category: ActivityCategory
  plan_date: string
  starts_at: string
  ends_at: string
  duration_seconds: number
  notes: string | null
  created_at: string
  updated_at: string
}
