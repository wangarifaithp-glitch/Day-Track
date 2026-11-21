import { Activity as ActivityIcon, ArrowRight, CalendarDays, Clock3, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { ActivityTimeline } from '../activities/ActivityTimeline'
import { ActivityTimer } from '../activities/ActivityTimer'
import {
  elapsedSeconds,
  formatDateLabel,
  formatDuration,
  localDateString,
} from '../activities/activityUtils'
import { useActivityData } from '../activities/useActivityData'

export function DashboardPage() {
  const today = localDateString()
  const navigate = useNavigate()
  const { activities, activeActivity, categories, loading, error, reload } =
    useActivityData(today)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!activeActivity) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [activeActivity])

  const todayActivities = useMemo(() => {
    const list = [...activities]
    if (
      activeActivity?.activity_date === today &&
      !list.some((activity) => activity.id === activeActivity.id)
    ) {
      list.push(activeActivity)
    }
    return list.sort((a, b) => a.started_at.localeCompare(b.started_at))
  }, [activities, activeActivity, today])

  const trackedSeconds = todayActivities.reduce(
    (total, activity) =>
      total + (activity.is_active ? elapsedSeconds(activity, now) : activity.duration_seconds),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-400">{formatDateLabel(today)}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">
            Your day, with intention
          </h1>
          <p className="mt-1 text-sm text-slate-500">A little awareness can change the shape of a day.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/timeline?log=1')}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:self-auto"
        >
          <Plus size={16} />
          Log a moment
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5 md:p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
            <Clock3 size={20} />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-400">Time tracked today</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {loading ? '—' : formatDuration(trackedSeconds)}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 md:p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
            <ActivityIcon size={20} />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-400">Activities recorded</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {loading ? '—' : todayActivities.length}
            </p>
          </div>
        </Card>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-800">Couldn’t connect to your activity data</p>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-2 text-sm font-semibold text-rose-800 underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      <ActivityTimer
        activeActivity={activeActivity}
        categories={categories}
        activityDate={today}
        onChanged={reload}
      />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 md:px-6">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-[#54806d]" />
              <h2 className="text-[15px] font-semibold text-slate-900">Today at a glance</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">Your day is made of the moments you make room for.</p>
          </div>
          <Link
            to="/timeline"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
          >
            Full timeline
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="p-4 md:p-6">
          {loading && todayActivities.length === 0 ? (
            <div className="grid min-h-36 place-items-center text-sm text-slate-400" role="status">
              Loading today’s activities…
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Activity details will appear when the API is available.
            </p>
          ) : todayActivities.length === 0 ? (
            <div className="rounded-2xl bg-[#f7f9f6] px-5 py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">Your timeline is ready when you are.</p>
              <p className="mt-1 text-sm text-slate-500">Start a timer above or add something you’ve already done.</p>
              <button
                type="button"
                onClick={() => navigate('/timeline?log=1')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-[#173a32] shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                <Plus size={15} />
                Log an activity
              </button>
            </div>
          ) : (
            <ActivityTimeline
              activities={todayActivities.slice(-4)}
            />
          )}
        </div>
      </Card>
    </div>
  )
}
