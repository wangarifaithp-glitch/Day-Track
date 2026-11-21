import { useEffect, useMemo, useState } from 'react'
import { Bell, LoaderCircle, Star, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { getErrorMessage } from '../../services/apiClient'
import { calendarService } from './calendarService'
import type { CalendarEvent, CalendarEventDraft, ReminderDraft } from './types'

type EventFormModalProps = {
  event?: CalendarEvent
  selectedDate: string
  onClose: () => void
  onSaved: () => Promise<void>
}

const DEFAULT_REMINDERS: ReminderDraft[] = [
  { relative_to: 'start', offset_seconds: -86_400 },
  { relative_to: 'start', offset_seconds: -3_600 },
  { relative_to: 'start', offset_seconds: -900 },
  { relative_to: 'start', offset_seconds: 0 },
  { relative_to: 'end', offset_seconds: 0 },
]

const PRESET_REMINDERS = [
  { label: '1 day before', relative_to: 'start', offset_seconds: -86_400 },
  { label: '1 hour before', relative_to: 'start', offset_seconds: -3_600 },
  { label: '15 minutes before', relative_to: 'start', offset_seconds: -900 },
  { label: 'At event start', relative_to: 'start', offset_seconds: 0 },
  { label: 'At event end', relative_to: 'end', offset_seconds: 0 },
] as const

type CustomAnchor = 'start_before' | 'start_after' | 'end_before' | 'end_after' | 'start_at' | 'end_at'

function formatLocalDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function localTime(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '09'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

function reminderKey(reminder: ReminderDraft): string {
  return `${reminder.relative_to}:${reminder.offset_seconds}`
}

function reminderDescription(reminder: ReminderDraft): string {
  const abs = Math.abs(reminder.offset_seconds)
  const days = Math.floor(abs / 86_400)
  const hours = Math.floor((abs % 86_400) / 3_600)
  const minutes = Math.floor((abs % 3_600) / 60)
  const amount = days > 0
    ? `${days} day${days === 1 ? '' : 's'}`
    : hours > 0
      ? `${hours} hour${hours === 1 ? '' : 's'}`
      : `${minutes} minute${minutes === 1 ? '' : 's'}`
  if (reminder.offset_seconds === 0) {
    return reminder.relative_to === 'start' ? 'At event start' : 'At event end'
  }
  const direction = reminder.offset_seconds < 0 ? 'before' : 'after'
  return `${amount} ${direction} ${reminder.relative_to}`
}

export function EventFormModal({
  event,
  selectedDate,
  onClose,
  onSaved,
}: EventFormModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(selectedDate)
  const [endDate, setEndDate] = useState(selectedDate)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [isAllDay, setIsAllDay] = useState(false)
  const [isImportant, setIsImportant] = useState(false)
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  )
  const [reminders, setReminders] = useState<ReminderDraft[]>(DEFAULT_REMINDERS)
  const [customAnchor, setCustomAnchor] = useState<CustomAnchor>('start_before')
  const [customAmount, setCustomAmount] = useState('30')
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>('minutes')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!event) {
      setTitle('')
      setDescription('')
      setStartDate(selectedDate)
      setEndDate(selectedDate)
      setStartTime('09:00')
      setEndTime('10:00')
      setIsAllDay(false)
      setIsImportant(false)
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
      setReminders(DEFAULT_REMINDERS)
      setError(null)
      return
    }

    setTitle(event.title)
    setDescription(event.description ?? '')
    setStartDate(event.start_date)
    setEndDate(event.end_date)
    setStartTime(localTime(event.starts_at, event.time_zone))
    setEndTime(localTime(event.ends_at, event.time_zone))
    setIsAllDay(event.is_all_day)
    setIsImportant(event.is_important)
    setTimeZone(event.time_zone)
    setReminders(event.reminders.map(({ relative_to, offset_seconds }) => ({
      relative_to,
      offset_seconds,
    })))
    setError(null)
  }, [event, selectedDate])

  const presetKeys = useMemo(
    () => new Set(PRESET_REMINDERS.map((reminder) => `${reminder.relative_to}:${reminder.offset_seconds}`)),
    [],
  )
  const customReminders = reminders.filter((reminder) => !presetKeys.has(reminderKey(reminder)))

  function togglePreset(relativeTo: 'start' | 'end', offsetSeconds: number, checked: boolean) {
    const candidate = { relative_to: relativeTo, offset_seconds: offsetSeconds }
    setReminders((current) => checked
      ? current.some((reminder) => reminderKey(reminder) === reminderKey(candidate))
        ? current
        : [...current, candidate]
      : current.filter((reminder) => reminderKey(reminder) !== reminderKey(candidate)))
  }

  function addCustomReminder() {
    const amount = Number(customAmount)
    if (!Number.isInteger(amount) || amount < 1 || amount > 365) {
      setError('Choose a reminder amount between 1 and 365.')
      return
    }

    const multiplier = customUnit === 'days' ? 86_400 : customUnit === 'hours' ? 3_600 : 60
    const relativeTo: ReminderDraft['relative_to'] = customAnchor.startsWith('start') ? 'start' : 'end'
    const direction = customAnchor.endsWith('before') ? -1 : 1
    const offsetSeconds = customAnchor.endsWith('_at') ? 0 : amount * multiplier * direction
    const candidate: ReminderDraft = { relative_to: relativeTo, offset_seconds: offsetSeconds }
    if (reminders.some((reminder) => reminderKey(reminder) === reminderKey(candidate))) {
      setError('That reminder is already on the list.')
      return
    }
    if (reminders.length >= 10) {
      setError('An event can have up to 10 reminders.')
      return
    }
    setError(null)
    setReminders((current) => [...current, candidate])
  }

  async function save(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setError(null)
    if (endDate < startDate) {
      setError('The event end date must be on or after its start date.')
      return
    }

    const startLocalTime = isAllDay ? '09:00' : startTime
    const endLocalTime = isAllDay ? '17:00' : endTime
    const startsAt = new Date(`${startDate}T${startLocalTime}`)
    const endsAt = new Date(`${endDate}T${endLocalTime}`)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      setError('Choose an end date and time after the event start.')
      return
    }

    const payload: CalendarEventDraft = {
      title: title.trim(),
      description: description.trim() || null,
      start_date: startDate,
      end_date: endDate,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      time_zone: timeZone,
      is_all_day: isAllDay,
      is_important: isImportant,
      reminders,
    }

    setBusy(true)
    try {
      if (event) {
        await calendarService.update(event.id, payload)
      } else {
        await calendarService.create(payload)
      }
      await onSaved()
      onClose()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget && !busy) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-title"
        className="max-h-[96vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
              A moment worth remembering
            </p>
            <h2 id="calendar-event-title" className="mt-1 text-xl font-semibold text-slate-900">
              {event ? 'Edit event' : 'Add an event'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close event form"
            onClick={onClose}
            disabled={busy}
            className="grid size-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(formEvent) => void save(formEvent)} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Event name</span>
            <input
              autoFocus
              required
              maxLength={160}
              value={title}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              placeholder="e.g. Family dinner, appointment, birthday"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
            />
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(changeEvent) => setIsAllDay(changeEvent.target.checked)}
              className="size-4 accent-cyan-700"
            />
            <span className="text-sm font-medium text-slate-700">All-day event</span>
            <span className="ml-auto text-xs text-slate-400">Reminders use 9am / 5pm local time</span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Starts</span>
              <input
                type="date"
                required
                value={startDate}
                onChange={(changeEvent) => {
                  setStartDate(changeEvent.target.value)
                  if (endDate < changeEvent.target.value) setEndDate(changeEvent.target.value)
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Ends</span>
              <input
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(changeEvent) => setEndDate(changeEvent.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
              />
            </label>
          </div>

          {!isAllDay && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Start time</span>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(changeEvent) => setStartTime(changeEvent.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">End time</span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(changeEvent) => setEndTime(changeEvent.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
                />
              </label>
            </div>
          )}

          <p className="text-xs text-slate-400">Times are saved in {timeZone} and normalized to UTC.</p>

          <button
            type="button"
            aria-pressed={isImportant}
            onClick={() => setIsImportant((current) => !current)}
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
              isImportant
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Star size={16} fill={isImportant ? 'currentColor' : 'none'} />
            {isImportant ? 'Important event' : 'Mark as important'}
          </button>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes <span className="font-normal text-slate-400">· optional</span>
            </span>
            <textarea
              rows={2}
              maxLength={5000}
              value={description}
              onChange={(changeEvent) => setDescription(changeEvent.target.value)}
              placeholder="Add a little context..."
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
            />
          </label>

          <fieldset className="rounded-2xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">Reminders</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESET_REMINDERS.map((preset) => {
                const checked = reminders.some(
                  (reminder) =>
                    reminder.relative_to === preset.relative_to &&
                    reminder.offset_seconds === preset.offset_seconds,
                )
                return (
                  <label key={preset.label} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(changeEvent) =>
                        togglePreset(preset.relative_to, preset.offset_seconds, changeEvent.target.checked)
                      }
                      className="size-4 accent-cyan-700"
                    />
                    {preset.label}
                  </label>
                )
              })}
            </div>

            {customReminders.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                {customReminders.map((reminder) => (
                  <li
                    key={reminderKey(reminder)}
                    className="flex items-center justify-between gap-3 text-xs text-slate-600"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Bell size={13} className="text-cyan-700" />
                      {reminderDescription(reminder)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReminders((current) =>
                          current.filter((item) => reminderKey(item) !== reminderKey(reminder)),
                        )
                      }
                      className="rounded px-2 py-1 font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
              <label className="min-w-[155px] flex-1">
                <span className="mb-1 block text-xs font-medium text-slate-500">Custom timing</span>
                <select
                  value={customAnchor}
                  onChange={(changeEvent) => setCustomAnchor(changeEvent.target.value as CustomAnchor)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="start_before">Before event starts</option>
                  <option value="start_at">At event start</option>
                  <option value="start_after">After event starts</option>
                  <option value="end_before">Before event ends</option>
                  <option value="end_at">At event end</option>
                  <option value="end_after">After event ends</option>
                </select>
              </label>
              {!customAnchor.endsWith('_at') && (
                <>
                  <label className="w-20">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Amount</span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={customAmount}
                      onChange={(changeEvent) => setCustomAmount(changeEvent.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                    />
                  </label>
                  <label className="w-24">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Unit</span>
                    <select
                      value={customUnit}
                      onChange={(changeEvent) =>
                        setCustomUnit(changeEvent.target.value as 'minutes' | 'hours' | 'days')
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </label>
                </>
              )}
              <button
                type="button"
                onClick={addCustomReminder}
                className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Add reminder
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Due reminders appear in the app and as browser notifications when enabled.
            </p>
          </fieldset>

          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-10 rounded-xl px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white transition hover:bg-[#245445] disabled:cursor-wait disabled:opacity-60"
            >
              {busy && <LoaderCircle size={15} className="animate-spin" />}
              {event ? 'Save changes' : 'Add event'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
