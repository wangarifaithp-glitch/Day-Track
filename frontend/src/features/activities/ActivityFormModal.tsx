import { useEffect, useState } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { activityService, getErrorMessage } from './activityService'
import {
  defaultCategoryId,
  localDateTimeToIso,
  localDateTimeValue,
  shiftDate,
} from './activityUtils'
import type { Activity, ActivityCategory } from './types'

type ActivityFormModalProps = {
  activity?: Activity
  activityDate: string
  categories: ActivityCategory[]
  onClose: () => void
  onSaved: () => Promise<void>
}

function defaultDateTime(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, '0')}:00`
}

export function ActivityFormModal({
  activity,
  activityDate,
  categories,
  onClose,
  onSaved,
}: ActivityFormModalProps) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(activityDate)
  const [startedAt, setStartedAt] = useState(defaultDateTime(activityDate, 9))
  const [endedAt, setEndedAt] = useState(defaultDateTime(activityDate, 10))
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (activity) {
      setTitle(activity.title)
      setCategoryId(activity.category_id)
      setDate(activity.activity_date)
      setStartedAt(localDateTimeValue(activity.started_at))
      setEndedAt(localDateTimeValue(activity.ended_at ?? activity.started_at))
      setNotes(activity.notes ?? '')
    } else {
      setCategoryId(defaultCategoryId(categories))
      setDate(activityDate)
      setStartedAt(defaultDateTime(activityDate, 9))
      setEndedAt(defaultDateTime(activityDate, 10))
    }
  }, [activity, activityDate, categories])

  function changeActivityDate(nextDate: string) {
    const endDayOffset = Math.max(
      0,
      Math.round(
        (new Date(`${endedAt.slice(0, 10)}T12:00:00`).getTime() -
          new Date(`${date}T12:00:00`).getTime()) /
          86_400_000,
      ),
    )
    setDate(nextDate)
    setStartedAt(`${nextDate}T${startedAt.slice(11)}`)
    setEndedAt(`${shiftDate(nextDate, endDayOffset)}T${endedAt.slice(11)}`)
  }

  function changeStartedAt(value: string) {
    const endDayOffset = Math.max(
      0,
      Math.round(
        (new Date(`${endedAt.slice(0, 10)}T12:00:00`).getTime() -
          new Date(`${date}T12:00:00`).getTime()) /
          86_400_000,
      ),
    )
    const nextDate = value.slice(0, 10)
    setStartedAt(value)
    setDate(nextDate)
    setEndedAt(`${shiftDate(nextDate, endDayOffset)}T${endedAt.slice(11)}`)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
      setError('End time must be after start time.')
      return
    }

    setBusy(true)
    try {
      const payload = {
        title: title.trim(),
        category_id: categoryId,
        activity_date: date,
        started_at: localDateTimeToIso(startedAt),
        ended_at: localDateTimeToIso(endedAt),
        notes: notes.trim() || null,
      }
      if (activity) {
        await activityService.update(activity.id, payload)
      } else {
        await activityService.create(payload)
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
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-form-title"
        className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              {activity ? 'Update your log' : 'A moment worth remembering'}
            </p>
            <h2 id="activity-form-title" className="mt-1 text-xl font-semibold text-slate-900">
              {activity ? 'Edit activity' : 'Log an activity'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(event) => void save(event)} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Activity name</span>
            <input
              autoFocus
              required
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Morning walk"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#6b9b81] focus:ring-2 focus:ring-[#6b9b81]/15"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Category</span>
              <select
                required
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#6b9b81] focus:ring-2 focus:ring-[#6b9b81]/15"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Activity date</span>
              <input
                type="date"
                required
                value={date}
                onChange={(event) => changeActivityDate(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#6b9b81] focus:ring-2 focus:ring-[#6b9b81]/15"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Started</span>
              <input
                type="datetime-local"
                required
                value={startedAt}
                onChange={(event) => changeStartedAt(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#6b9b81] focus:ring-2 focus:ring-[#6b9b81]/15"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Ended</span>
              <input
                type="datetime-local"
                required
                value={endedAt}
                onChange={(event) => setEndedAt(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#6b9b81] focus:ring-2 focus:ring-[#6b9b81]/15"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes <span className="font-normal text-slate-400">· optional</span>
            </span>
            <textarea
              rows={3}
              maxLength={5000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add a little context for later..."
              className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#6b9b81] focus:ring-2 focus:ring-[#6b9b81]/15"
            />
          </label>

          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || categories.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white transition hover:bg-[#245445] disabled:cursor-wait disabled:opacity-60"
            >
              {busy && <LoaderCircle size={15} className="animate-spin" />}
              {activity ? 'Save changes' : 'Save activity'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
