import { useEffect, useState } from 'react'
import { CircleStop, LoaderCircle, Play, Timer } from 'lucide-react'
import type { FormEvent } from 'react'
import { Card } from '../../components/ui/Card'
import { activityService, getErrorMessage } from './activityService'
import { defaultCategoryId, elapsedSeconds, formatDuration, formatElapsed } from './activityUtils'
import type { Activity, ActivityCategory } from './types'

type ActivityTimerProps = {
  activeActivity: Activity | null
  categories: ActivityCategory[]
  activityDate: string
  onChanged: () => Promise<void>
}

export function ActivityTimer({
  activeActivity,
  categories,
  activityDate,
  onChanged,
}: ActivityTimerProps) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(defaultCategoryId(categories))
  }, [categories, categoryId])

  useEffect(() => {
    if (!activeActivity) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [activeActivity])

  async function startActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await activityService.start({
        title: title.trim(),
        category_id: categoryId,
        activity_date: activityDate,
      })
      setTitle('')
      await onChanged()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function stopActivity() {
    if (!activeActivity) return
    setBusy(true)
    setError(null)
    try {
      await activityService.stop(activeActivity.id)
      await onChanged()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="overflow-hidden border-[#dce9e1] bg-[#f3f8f4]">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#173a32] text-white shadow-sm">
            <Timer size={21} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#54806d]">
              {activeActivity ? 'In progress' : 'Make this moment count'}
            </p>
            {activeActivity ? (
              <>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {activeActivity.title}
                </h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: activeActivity.category.color }}
                  />
                  {activeActivity.category.name}
                  <span className="text-slate-300">·</span>
                  Started {formatDuration(elapsedSeconds(activeActivity, now))} ago
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                Start a timer and let DAYTRACK take care of the time.
              </p>
            )}
          </div>
        </div>

        {activeActivity ? (
          <div className="flex items-center justify-between gap-5 md:justify-end">
            <p
              className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-[#173a32] md:text-[28px]"
              aria-live="off"
              aria-label={`Elapsed time ${formatElapsed(elapsedSeconds(activeActivity, now))}`}
            >
              {formatElapsed(elapsedSeconds(activeActivity, now))}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void stopActivity()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#245445] disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <CircleStop size={16} />}
              Stop activity
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => void startActivity(event)}
            className="grid gap-2 sm:grid-cols-[minmax(150px,1fr)_minmax(170px,0.8fr)_auto] md:min-w-[520px]"
          >
            <label className="sr-only" htmlFor="timer-title">Activity name</label>
            <input
              id="timer-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What are you doing?"
              required
              maxLength={160}
              className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#6b9b81] focus:ring-2 focus:ring-[#6b9b81]/15"
            />
            <label className="sr-only" htmlFor="timer-category">Activity category</label>
            <select
              id="timer-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
              disabled={categories.length === 0}
              className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#6b9b81] focus:ring-2 focus:ring-[#6b9b81]/15"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy || categories.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#245445] disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Play size={15} fill="currentColor" />}
              Start
            </button>
          </form>
        )}
      </div>
      {error && (
        <p role="alert" className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700 md:px-6">
          {error}
        </p>
      )}
    </Card>
  )
}
