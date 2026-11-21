import { useEffect, useState } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { defaultCategoryId, shiftDate } from '../activities/activityUtils'
import type { ActivityCategory } from '../activities/types'
import { getErrorMessage } from '../../services/apiClient'
import { plannerService } from './plannerService'
import type { PlannedActivity } from './types'

type PlanFormModalProps = {
  plan?: PlannedActivity
  planDate: string
  categories: ActivityCategory[]
  onClose: () => void
  onSaved: () => Promise<void>
}

function localTime(value: string): string {
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function localDateTimeToIso(date: string, time: string, dayOffset = 0): string {
  const planDay = dayOffset === 0 ? date : shiftDate(date, dayOffset)
  return new Date(`${planDay}T${time}`).toISOString()
}

export function PlanFormModal({
  plan,
  planDate,
  categories,
  onClose,
  onSaved,
}: PlanFormModalProps) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(planDate)
  const [startsAt, setStartsAt] = useState('09:00')
  const [endsAt, setEndsAt] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (plan) {
      setTitle(plan.title)
      setCategoryId(plan.category_id)
      setDate(plan.plan_date)
      setStartsAt(localTime(plan.starts_at))
      setEndsAt(localTime(plan.ends_at))
      setNotes(plan.notes ?? '')
    } else {
      setTitle('')
      setCategoryId(defaultCategoryId(categories))
      setDate(planDate)
      setStartsAt('09:00')
      setEndsAt('10:00')
      setNotes('')
    }
  }, [categories, plan, planDate])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (endsAt === startsAt) {
      setError('Choose a different end time.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const overnight = endsAt < startsAt
      const payload = {
        title: title.trim(),
        category_id: categoryId,
        plan_date: date,
        starts_at: localDateTimeToIso(date, startsAt),
        ends_at: localDateTimeToIso(date, endsAt, overnight ? 1 : 0),
        notes: notes.trim() || null,
      }
      if (plan) {
        await plannerService.update(plan.id, payload)
      } else {
        await plannerService.create(payload)
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
        aria-labelledby="plan-form-title"
        className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Shape the day ahead
            </p>
            <h2 id="plan-form-title" className="mt-1 text-xl font-semibold text-slate-900">
              {plan ? 'Edit planned activity' : 'Add to your plan'}
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
              placeholder="e.g. Focused work session"
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
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Date</span>
              <input
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#6b9b81] focus:ring-2 focus:ring-[#6b9b81]/15"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Starts</span>
              <input
                type="time"
                required
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#6b9b81] focus:ring-2 focus:ring-[#6b9b81]/15"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Ends</span>
              <input
                type="time"
                required
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#6b9b81] focus:ring-2 focus:ring-[#6b9b81]/15"
              />
            </label>
          </div>
          <p className="-mt-2 text-xs text-slate-400">
            An end time earlier than the start time is scheduled for the following day.
          </p>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes <span className="font-normal text-slate-400">· optional</span>
            </span>
            <textarea
              rows={3}
              maxLength={5000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add context or a reminder..."
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
              {plan ? 'Save changes' : 'Add to plan'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
