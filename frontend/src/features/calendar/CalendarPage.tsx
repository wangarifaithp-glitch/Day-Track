import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  LoaderCircle,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '../../services/apiClient'
import { calendarService } from './calendarService'
import { EventFormModal } from './EventFormModal'
import type { CalendarEvent } from './types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function localDateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dateFromKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  const date = new Date(0)
  date.setHours(0, 0, 0, 0)
  date.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return localDateKey(date) === key ? date : null
}

function firstOfMonth(year: number, month: number): Date {
  const date = new Date(0)
  date.setHours(0, 0, 0, 0)
  date.setFullYear(year, month, 1)
  return date
}

function addMonths(date: Date, amount: number): Date {
  const target = firstOfMonth(date.getFullYear(), date.getMonth() + amount)
  if (target.getFullYear() < 1) return firstOfMonth(1, 0)
  if (target.getFullYear() > 9999) return firstOfMonth(9999, 11)
  return target
}

function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function timeLabel(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function dateLabel(value: string, options: Intl.DateTimeFormatOptions): string {
  const date = dateFromKey(value)
  return date ? new Intl.DateTimeFormat(undefined, options).format(date) : value
}

function eventRangeLabel(event: CalendarEvent): string {
  if (event.is_all_day) {
    if (event.start_date === event.end_date) return 'All day'
    return `All day · ${dateLabel(event.start_date, { month: 'short', day: 'numeric' })} – ${dateLabel(event.end_date, { month: 'short', day: 'numeric' })}`
  }
  return `${timeLabel(event.starts_at)} – ${timeLabel(event.ends_at)}`
}

function reminderLabel(offsetSeconds: number, relativeTo: 'start' | 'end'): string {
  if (offsetSeconds === 0) return `At ${relativeTo}`
  const minutes = Math.abs(offsetSeconds) / 60
  const unit = minutes % 1440 === 0
    ? `${minutes / 1440}d`
    : minutes % 60 === 0
      ? `${minutes / 60}h`
      : `${minutes}m`
  return `${unit} ${offsetSeconds < 0 ? 'before' : 'after'} ${relativeTo}`
}

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const todayKey = localDateKey(new Date())
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [month, setMonth] = useState(() => firstOfMonth(new Date().getFullYear(), new Date().getMonth()))
  const [yearInput, setYearInput] = useState(String(month.getFullYear()))
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [yearError, setYearError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>()
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const requestId = useRef(0)

  const gridDays = useMemo(() => {
    const first = firstOfMonth(month.getFullYear(), month.getMonth())
    const offset = mondayIndex(first)
    const lastDay = firstOfMonth(month.getFullYear(), month.getMonth() + 1)
    lastDay.setDate(0)
    const dayCount = lastDay.getDate()
    const cellCount = Math.ceil((offset + dayCount) / 7) * 7
    const start = new Date(first)
    start.setDate(first.getDate() - offset)
    return Array.from({ length: cellCount }, (_, index): Date | null => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date.getFullYear() < 1 || date.getFullYear() > 9999 ? null : date
    })
  }, [month])

  const validGridDays = gridDays.filter((date): date is Date => date !== null)
  const rangeStart = validGridDays.length ? localDateKey(validGridDays[0]) : localDateKey(month)
  const rangeEnd = validGridDays.length ? localDateKey(validGridDays[validGridDays.length - 1]) : localDateKey(month)

  const loadEvents = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await calendarService.getForRange(rangeStart, rangeEnd)
      if (currentRequestId === requestId.current) setEvents(result)
    } catch (requestError) {
      if (currentRequestId === requestId.current) setError(getErrorMessage(requestError))
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [rangeEnd, rangeStart])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  useEffect(() => {
    const requestedDate = searchParams.get('date')
    if (!requestedDate) return
    const parsedDate = dateFromKey(requestedDate)
    if (!parsedDate) return
    setSelectedDate(requestedDate)
    setMonth(firstOfMonth(parsedDate.getFullYear(), parsedDate.getMonth()))
    setYearInput(String(parsedDate.getFullYear()))
  }, [searchParams])

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>()
    for (const date of validGridDays) {
      const key = localDateKey(date)
      const dayEvents = events.filter((event) => event.start_date <= key && event.end_date >= key)
      if (dayEvents.length) grouped.set(key, dayEvents)
    }
    return grouped
  }, [events, validGridDays])

  const selectedEvents = eventsByDate.get(selectedDate) ?? []
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(month)
  const selectedDateLabel = dateLabel(selectedDate, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  function chooseDate(key: string) {
    setSelectedDate(key)
    const parsedDate = dateFromKey(key)
    if (parsedDate) {
      setMonth(firstOfMonth(parsedDate.getFullYear(), parsedDate.getMonth()))
      setYearInput(String(parsedDate.getFullYear()))
    }
    setSearchParams({ date: key }, { replace: true })
  }

  function shiftMonth(amount: number) {
    const next = addMonths(month, amount)
    setYearInput(String(next.getFullYear()))
    const selected = dateFromKey(selectedDate)
    const lastDay = firstOfMonth(next.getFullYear(), next.getMonth() + 1)
    lastDay.setDate(0)
    const nextSelected = firstOfMonth(next.getFullYear(), next.getMonth())
    nextSelected.setDate(Math.min(selected?.getDate() ?? 1, lastDay.getDate()))
    chooseDate(localDateKey(nextSelected))
  }

  function goToYear(value: string) {
    const year = Number(value)
    if (!/^\d{1,4}$/.test(value) || !Number.isInteger(year) || year < 1 || year > 9999) {
      setYearError('Enter a year between 1 and 9999.')
      return
    }
    setYearError(null)
    if (year === month.getFullYear()) return
    const nextMonth = firstOfMonth(year, month.getMonth())
    const lastDay = firstOfMonth(year, month.getMonth() + 1)
    lastDay.setDate(0)
    const selected = dateFromKey(selectedDate)
    nextMonth.setDate(Math.min(selected?.getDate() ?? 1, lastDay.getDate()))
    chooseDate(localDateKey(nextMonth))
  }

  function openCreateForm() {
    setEditingEvent(undefined)
    setFormOpen(true)
  }

  function openEditForm(event: CalendarEvent) {
    setEditingEvent(event)
    setFormOpen(true)
  }

  async function deleteEvent(event: CalendarEvent) {
    if (!window.confirm(`Delete "${event.title}"? This will also remove its scheduled reminders.`)) return
    setDeletingId(event.id)
    setError(null)
    try {
      await calendarService.delete(event.id)
      if (expandedEventId === event.id) setExpandedEventId(null)
      await loadEvents()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Make space for what matters</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">See what’s ahead, and remember the moments that matter.</p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d473d]"
        >
          <Plus size={17} />
          Add event
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={() => void loadEvents()} className="ml-auto shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.8fr)]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100"
              >
                <ArrowLeft size={17} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
                className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100"
              >
                <ArrowRight size={17} />
              </button>
              <h2 className="ml-1 min-w-[145px] text-lg font-semibold text-slate-900">
                {monthLabel} <span className="text-slate-400">{month.getFullYear()}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="calendar-year">Calendar year</label>
              <input
                id="calendar-year"
                type="number"
                min="1"
                max="9999"
                value={yearInput}
                onFocus={(focusEvent) => focusEvent.currentTarget.select()}
                onChange={(changeEvent) => {
                  const value = changeEvent.target.value
                  setYearInput(value)
                  setYearError(null)
                  if (/^\d{4}$/.test(value)) goToYear(value)
                }}
                onBlur={() => {
                  if (yearInput) goToYear(yearInput)
                }}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'Enter') goToYear(yearInput)
                }}
                aria-label="Year; calendar updates automatically"
                title="Enter a year to update the calendar"
                className="h-9 w-[86px] rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
              />
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  setMonth(firstOfMonth(now.getFullYear(), now.getMonth()))
                  setYearInput(String(now.getFullYear()))
                  chooseDate(todayKey)
                }}
                className="hidden h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:inline-flex sm:items-center"
              >
                Today
              </button>
            </div>
            {yearError && (
              <p role="alert" className="basis-full text-right text-xs text-rose-700">
                {yearError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
                {day}
              </div>
            ))}
          </div>

          <div className={`grid grid-cols-7 ${loading ? 'opacity-60' : ''}`}>
            {gridDays.map((date, index) => {
              if (!date) {
                return <div key={`calendar-edge-${month.getFullYear()}-${index}`} className="min-h-[76px] border-b border-r border-slate-100 bg-slate-50/50 sm:min-h-[105px]" aria-hidden="true" />
              }
              const key = localDateKey(date)
              const inMonth = date.getMonth() === month.getMonth()
              const isSelected = selectedDate === key
              const isToday = todayKey === key
              const dayEvents = eventsByDate.get(key) ?? []
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => chooseDate(key)}
                  aria-pressed={isSelected}
                  aria-label={`${dateLabel(key, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
                  className={`group relative min-h-[76px] border-b border-r border-slate-100 p-1.5 text-left transition sm:min-h-[105px] sm:p-2 ${
                    inMonth ? 'bg-white' : 'bg-slate-50/50'
                  } ${isSelected ? 'z-[1] outline outline-2 outline-inset outline-cyan-600' : 'hover:bg-cyan-50/50'}`}
                >
                  <span className={`grid size-7 place-items-center rounded-full text-xs font-medium sm:size-8 sm:text-sm ${
                    isToday
                      ? 'bg-[#173a32] font-bold text-white'
                      : isSelected
                        ? 'bg-cyan-100 text-cyan-800'
                        : inMonth
                          ? 'text-slate-700'
                          : 'text-slate-300'
                  }`}>
                    {date.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="mt-1.5 hidden space-y-1 sm:block">
                      {dayEvents.slice(0, 2).map((event) => (
                        <span
                          key={event.id}
                          className={`block truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                            event.is_important
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-cyan-50 text-cyan-800'
                          }`}
                        >
                          {event.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="block px-1 text-[9px] font-medium text-slate-400">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </span>
                  )}
                  {dayEvents.length > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 flex gap-0.5 sm:hidden">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className={`size-1.5 rounded-full ${event.is_important ? 'bg-amber-500' : 'bg-cyan-600'}`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-cyan-600" />Event</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500" />Important</span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              {loading && <LoaderCircle size={13} className="animate-spin" />}
              {loading ? 'Loading events' : `${events.length} event${events.length === 1 ? '' : 's'} this month`}
            </span>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                {selectedDate === todayKey ? 'Your day' : 'Selected day'}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{selectedDateLabel}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {selectedEvents.length
                  ? `${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'}`
                  : 'A little breathing room'}
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
              <CalendarDays size={18} />
            </span>
          </div>

          {loading && events.length === 0 ? (
            <div className="grid min-h-52 place-items-center text-center">
              <span>
                <LoaderCircle size={22} className="mx-auto animate-spin text-cyan-700" />
                <span className="mt-2 block text-sm text-slate-400">Loading your events…</span>
              </span>
            </div>
          ) : selectedEvents.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                <CalendarDays size={21} />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-700">Nothing planned for this day</p>
              <p className="mx-auto mt-1 max-w-[230px] text-xs leading-5 text-slate-400">
                Add an event or reminder to make a note of something important.
              </p>
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Plus size={14} /> Add event
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {selectedEvents.map((event) => {
                const expanded = expandedEventId === event.id
                return (
                  <li key={event.id} className="px-4 py-3">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setExpandedEventId(expanded ? null : event.id)}
                      className="flex w-full items-start gap-3 rounded-xl text-left"
                    >
                      <span className={`mt-1 h-10 w-1 shrink-0 rounded-full ${
                        event.is_important ? 'bg-amber-400' : 'bg-cyan-600'
                      }`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-slate-800">{event.title}</span>
                          {event.is_important && <Star size={13} fill="currentColor" className="shrink-0 text-amber-500" />}
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Clock3 size={12} /> {eventRangeLabel(event)}
                        </span>
                        {event.start_date !== event.end_date && (
                          <span className="mt-1 block text-[10px] text-slate-400">
                            {dateLabel(event.start_date, { month: 'short', day: 'numeric' })} – {dateLabel(event.end_date, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 text-[10px] font-medium text-slate-400">
                        {expanded ? 'Hide' : 'Details'}
                      </span>
                    </button>
                    {expanded && (
                      <div className="ml-4 mt-3 rounded-xl bg-slate-50 p-3">
                        {event.description ? (
                          <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">{event.description}</p>
                        ) : (
                          <p className="text-xs text-slate-400">No additional notes.</p>
                        )}
                        {event.reminders.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {event.reminders.map((reminder) => (
                              <span
                                key={reminder.id}
                                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500"
                              >
                                {reminderLabel(reminder.offset_seconds, reminder.relative_to)}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(event)}
                            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Edit event
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === event.id}
                            onClick={() => void deleteEvent(event)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-100 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                          >
                            {deletingId === event.id
                              ? <LoaderCircle size={13} className="animate-spin" />
                              : <Trash2 size={13} />}
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={openCreateForm}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-500 transition hover:border-cyan-400 hover:bg-cyan-50/50 hover:text-cyan-800"
            >
              <Plus size={15} /> Add an event
            </button>
          </div>
        </section>
      </div>

      {events.length === 0 && !loading && !error && (
        <div className="sr-only" role="status"><Check /> No events in this month yet.</div>
      )}

      {formOpen && (
        <EventFormModal
          event={editingEvent}
          selectedDate={selectedDate}
          onClose={() => {
            setFormOpen(false)
            setEditingEvent(undefined)
          }}
          onSaved={loadEvents}
        />
      )}
    </div>
  )
}
