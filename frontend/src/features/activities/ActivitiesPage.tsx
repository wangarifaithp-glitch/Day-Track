import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RotateCcw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { ActivityFormModal } from './ActivityFormModal'
import { ActivityTimeline } from './ActivityTimeline'
import { ActivityTimer } from './ActivityTimer'
import { activityService, getErrorMessage } from './activityService'
import { elapsedSeconds, formatDateLabel, formatDuration, localDateString, shiftDate } from './activityUtils'
import { useActivityData } from './useActivityData'
import type { Activity } from './types'

export function ActivitiesPage() {
  const [activityDate, setActivityDate] = useState(localDateString())
  const [searchParams, setSearchParams] = useSearchParams()
  const [formActivity, setFormActivity] = useState<Activity | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const { activities, activeActivity, categories, loading, error, reload } =
    useActivityData(activityDate)

  useEffect(() => {
    if (!activeActivity) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [activeActivity])

  useEffect(() => {
    if (searchParams.has('log')) {
      setFormActivity(undefined)
      setFormOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const chronological = useMemo(
    () => [...activities].sort((a, b) => a.started_at.localeCompare(b.started_at)),
    [activities],
  )
  const trackedSeconds = chronological.reduce(
    (total, activity) =>
      total + (activity.is_active ? elapsedSeconds(activity, now) : activity.duration_seconds),
    0,
  )
  const setDateBy = (amount: number) => setActivityDate((current) => shiftDate(current, amount))

  async function deleteActivity(activity: Activity) {
    if (!window.confirm(`Delete “${activity.title}” from your timeline?`)) return
    setActionError(null)
    try {
      await activityService.delete(activity.id)
      await reload()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    }
  }

  async function refresh() {
    await reload()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-400">Make space for what matters</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">My Timeline</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormActivity(undefined)
            setFormOpen(true)
          }}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:self-auto"
        >
          <Plus size={16} />
          Log activity
        </button>
      </div>

      <ActivityTimer
        activeActivity={activeActivity}
        categories={categories}
        activityDate={localDateString()}
        onChanged={refresh}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setDateBy(-1)}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <ChevronLeft size={18} />
          </button>
          <label className="relative flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
            <CalendarDays size={16} className="shrink-0 text-[#54806d]" />
            <span className="sr-only">Select timeline date</span>
            <input
              type="date"
              aria-label="Select timeline date"
              value={activityDate}
              onChange={(event) => setActivityDate(event.target.value)}
              className="min-w-0 bg-transparent outline-none"
            />
          </label>
          <button
            type="button"
            aria-label="Next day"
            onClick={() => setDateBy(1)}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <ChevronRight size={18} />
          </button>
          {activityDate !== localDateString() && (
            <button
              type="button"
              onClick={() => setActivityDate(localDateString())}
              className="ml-1 inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              <RotateCcw size={13} />
              Today
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500">{formatDateLabel(activityDate)}</p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Your day, in moments</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {chronological.length} {chronological.length === 1 ? 'activity' : 'activities'} · {formatDuration(trackedSeconds)} tracked
            </p>
          </div>
          {loading && (
            <span className="text-xs font-medium text-slate-400" role="status">Updating timeline…</span>
          )}
        </div>
        <div className="p-4 md:p-6">
          {error ? (
            <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
              <p className="text-sm font-semibold text-rose-800">Your timeline could not load</p>
              <p className="mt-1 text-sm text-rose-700">{error}</p>
              <button
                type="button"
                onClick={() => void reload()}
                className="mt-3 text-sm font-semibold text-rose-800 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          ) : loading && chronological.length === 0 ? (
            <div className="grid min-h-56 place-items-center text-sm text-slate-400" role="status">
              Loading your day…
            </div>
          ) : (
            <ActivityTimeline
              activities={chronological}
              onEdit={(activity) => {
                setFormActivity(activity)
                setFormOpen(true)
              }}
              onDelete={(activity) => void deleteActivity(activity)}
            />
          )}
        </div>
      </Card>
      {actionError && (
        <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </p>
      )}
      {formOpen && (
        <ActivityFormModal
          activity={formActivity}
          activityDate={activityDate}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
