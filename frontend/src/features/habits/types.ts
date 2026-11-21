export type Habit = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type HabitProgress = Habit & {
  is_completed: boolean
  current_streak: number
}

export type HabitDraft = {
  name: string
  description: string | null
}
