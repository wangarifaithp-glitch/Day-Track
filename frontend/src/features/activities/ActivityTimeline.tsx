import { useEffect, useState } from 'react'
import { Clock3, Eye, Pencil, Trash2 } from 'lucide-react'
import { ActivityDetailsModal } from './ActivityDetailsModal'
import {
  elapsedSeconds,
  formatDuration,
  formatTime,
} from './activityUtils'
import type { Activity } from './types'

type ActivityTimelineProps = {
  activities: Activity[]
  onEdit?: (activity: Activity) => void
  onDelete?: (activity: Activity) => void
}

export function ActivityTimeline({
  activities,
  onEdit,
  onDelete,
}: ActivityTimelineProps) {
  const [detailsActivity, setDetailsActivity] = useState<Activity | null>(null)
  const [now, setNow] = useState(Date.now())
  const hasActiveActivity = activities.some((activity) => activity.is_active)

  useEffect(() => {
    if (!hasActiveActivity) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [hasActiveActivity])

  if (activities.length === 0) {
    return (
      <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eef4ef] text-[#54806d]">
            <Clock3 size={21} />
          </span>
          <h3 className="mt-4 text-base font-semibold text-slate-800">A fresh page for today</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
            Your activities will appear here as your day unfolds. Start a timer or add a moment from earlier.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[77px] before:top-4 before:w-px before:bg-slate-100">
        {activities.map((activity) => (
          <li key={activity.id} className="relative grid grid-cols-[62px_1fr] gap-3 md:grid-cols-[78px_1fr] md:gap-4">
            <div className="pt-4 text-right">
              <time className="text-xs font-medium tabular-nums text-slate-400">
                {formatTime(activity.started_at)}
              </time>
            </div>
            <article
              className={`relative rounded-2xl border p-4 transition-colors md:p-5 ${
                activity.is_active
                  ? 'border-emerald-200 bg-[#f5faf6]'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <span
                className="absolute -left-[20px] top-[22px] size-2.5 rounded-full border-2 border-white shadow-sm md:-left-[21px]"
                style={{ backgroundColor: activity.category.color }}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-800">{activity.title}</h3>
                    {activity.is_active && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
                        In progress
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                    <span
                      className="rounded-full px-2 py-1 font-medium"
                      style={{
                        backgroundColor: `${activity.category.color}18`,
                        color: activity.category.color,
                      }}
                    >
                      {activity.category.name}
                    </span>
                    <span>
                      {formatTime(activity.started_at)} — {activity.ended_at ? formatTime(activity.ended_at) : 'now'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>{formatDuration(elapsedSeconds(activity, now))}</span>
                  </div>
                  {activity.notes && (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{activity.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`View ${activity.title}`}
                    title="View details"
                    onClick={() => setDetailsActivity(activity)}
                    className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Eye size={16} />
                  </button>
                  {onEdit && (
                    <button
                    type="button"
                    aria-label={`Edit ${activity.title}`}
                    title="Edit activity"
                    disabled={activity.is_active}
                    onClick={() => onEdit(activity)}
                    className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                    type="button"
                    aria-label={`Delete ${activity.title}`}
                    title="Delete activity"
                    onClick={() => onDelete(activity)}
                    className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>
      {detailsActivity && (
        <ActivityDetailsModal
          activity={detailsActivity}
          onClose={() => setDetailsActivity(null)}
        />
      )}
    </>
  )
}
