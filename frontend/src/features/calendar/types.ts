export type CalendarReminder = {
  id: string
  relative_to: 'start' | 'end'
  offset_seconds: number
  scheduled_at: string
  status: 'pending' | 'sent' | 'missed'
}

export type ReminderDraft = {
  relative_to: 'start' | 'end'
  offset_seconds: number
}

export type CalendarEvent = {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  starts_at: string
  ends_at: string
  time_zone: string
  is_all_day: boolean
  is_important: boolean
  reminders: CalendarReminder[]
  created_at: string
  updated_at: string
}

export type CalendarEventDraft = Omit<
  CalendarEvent,
  'id' | 'reminders' | 'created_at' | 'updated_at'
> & {
  reminders: ReminderDraft[]
}

export type AppNotification = {
  id: string
  event_id: string | null
  title: string
  body: string
  url: string
  created_at: string
  read_at: string | null
}

export type BrowserPushSubscription = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}
