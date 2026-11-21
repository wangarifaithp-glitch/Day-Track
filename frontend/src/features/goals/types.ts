export type GoalStatus = 'active' | 'paused' | 'completed'

export type Goal = {
  id: string
  title: string
  description: string | null
  target_date: string | null
  progress_percent: number
  status: GoalStatus
  created_at: string
  updated_at: string
}

export type GoalDraft = {
  title: string
  description: string | null
  target_date: string | null
  progress_percent: number
  status: GoalStatus
}

export type GoalFilter = 'all' | GoalStatus
