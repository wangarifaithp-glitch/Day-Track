export type ActivityCategory = {
  id: string
  name: string
  color: string
  icon: string
  is_default: boolean
}

export type Activity = {
  id: string
  title: string
  category_id: string
  category: ActivityCategory
  activity_date: string
  started_at: string
  ended_at: string | null
  duration_seconds: number
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type ActivityDraft = {
  title: string
  category_id: string
  activity_date: string
  started_at: string
  ended_at: string
  notes: string
}
