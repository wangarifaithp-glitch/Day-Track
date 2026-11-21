import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { elapsedSeconds, formatDateLabel, formatDuration, formatTime } from './activityUtils'
import type { Activity } from './types'

export function ActivityDetailsModal({
  activity,
  onClose,
}: {
  activity: Activity
  onClose: () => void
}) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!activity.is_active) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [activity.is_active])

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
        aria-labelledby="activity-details-title"
        className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Activity details
            </p>
            <h2 id="activity-details-title" className="mt-1 text-xl font-semibold text-slate-900">
              {activity.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mb-5 flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: activity.category.color }} />
          <span className="text-sm font-medium text-slate-700">{activity.category.name}</span>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-medium text-slate-400">Date</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">{formatDateLabel(activity.activity_date)}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-medium text-slate-400">Duration</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">
              {formatDuration(activity.is_active ? elapsedSeconds(activity, now) : activity.duration_seconds)}
            </dd>
          </div>
          <div className="col-span-2 rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-medium text-slate-400">Time</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">
              {formatTime(activity.started_at)} — {activity.ended_at ? formatTime(activity.ended_at) : 'In progress'}
            </dd>
          </div>
        </dl>
        {activity.notes && (
          <div className="mt-3 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-400">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{activity.notes}</p>
          </div>
        )}
      </section>
    </div>
  )
}
