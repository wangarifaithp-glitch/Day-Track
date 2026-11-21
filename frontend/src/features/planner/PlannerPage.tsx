import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, RotateCcw, Trash2, Pencil } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { activityService } from '../activities/activityService'
import {
  formatDateLabel,
  formatDuration,
  formatTime,
  localDateString,
  shiftDate,
} from '../activities/activityUtils'
import type { ActivityCategory } from '../activities/types'
import { getErrorMessage } from '../../services/apiClient'
import { PlanFormModal } from './PlanFormModal'
import { plannerService } from './plannerService'
import type { PlannedActivity } from './types'

export function PlannerPage() {
  const [planDate, setPlanDate] = useState(localDateString())
  const [plans, setPlans] = useState<PlannedActivity[]>([])
  const [categories, setCategories] = useState<ActivityCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState<PlannedActivity | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const [nextPlans, nextCategories] = await Promise.all([
        plannerService.getForDate(planDate),
        activityService.getCategories(),
      ])
      if (currentRequestId === requestId.current) {
        setPlans(nextPlans)
        setCategories(nextCategories)
      }
    } catch (requestError) {
      if (currentRequestId === requestId.current) setError(getErrorMessage(requestError))
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [planDate])

  useEffect(() => {
    void reload()
    return () => {
      requestId.current += 1
    }
  }, [reload])

  const chronological = useMemo(
    () => [...plans].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [plans],
  )
  const plannedSeconds = chronological.reduce((total, plan) => total + plan.duration_seconds, 0)
  const today = localDateString()

  async function deletePlan(plan: PlannedActivity) {
    if (!window.confirm(`Remove “${plan.title}” from this plan?`)) return
    setActionError(null)
    try {
      await plannerService.delete(plan.id)
      await reload()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-400">Give your time a little direction</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">Plan your day</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingPlan(undefined)
            setFormOpen(true)
          }}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-[#173a32] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245445] sm:self-auto"
        >
          <Plus size={16} />
          Add to plan
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setPlanDate((current) => shiftDate(current, -1))}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <ChevronLeft size={18} />
          </button>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
            <CalendarDays size={16} className="shrink-0 text-[#54806d]" />
            <span className="sr-only">Select planning date</span>
            <input
              type="date"
              aria-label="Select planning date"
              value={planDate}
              onChange={(event) => setPlanDate(event.target.value)}
              className="min-w-0 bg-transparent outline-none"
            />
          </label>
          <button
            type="button"
            aria-label="Next day"
            onClick={() => setPlanDate((current) => shiftDate(current, 1))}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <ChevronRight size={18} />
          </button>
          {planDate !== today && (
            <button
              type="button"
              onClick={() => setPlanDate(today)}
              className="ml-1 inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              <RotateCcw size={13} />
              Today
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500">{formatDateLabel(planDate)}</p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
          <div>
            <div className="flex items-center gap-2">
              <Clock3 size={16} className="text-[#54806d]" />
              <h2 className="text-[15px] font-semibold text-slate-900">Your plan, at a glance</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {chronological.length} {chronological.length === 1 ? 'planned activity' : 'planned activities'} · {formatDuration(plannedSeconds)} planned
            </p>
          </div>
          {loading && <span role="status" className="text-xs font-medium text-slate-400">Updating plan…</span>}
        </div>

        <div className="p-4 md:p-6">
          {error ? (
            <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
              <p className="text-sm font-semibold text-rose-800">Your plan could not load</p>
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
              Loading your plan…
            </div>
          ) : chronological.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eef4ef] text-[#54806d]">
                  <CalendarDays size={21} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-800">Make a plan that feels like yours</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                  Add a few activities to give your day a gentle shape. You can adjust the plan any time.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlan(undefined)
                    setFormOpen(true)
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#173a32] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#245445]"
                >
                  <Plus size={15} />
                  Add your first activity
                </button>
              </div>
            </div>
          ) : (
            <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[77px] before:top-4 before:w-px before:bg-slate-100">
              {chronological.map((plan) => (
                <li key={plan.id} className="relative grid grid-cols-[62px_1fr] gap-3 md:grid-cols-[78px_1fr] md:gap-4">
                  <div className="pt-4 text-right">
                    <time className="text-xs font-medium tabular-nums text-slate-400">
                      {formatTime(plan.starts_at)}
                    </time>
                  </div>
                  <article className="relative rounded-2xl border border-slate-100 bg-white p-4 transition-colors hover:border-slate-200 md:p-5">
                    <span
                      className="absolute -left-[20px] top-[22px] size-2.5 rounded-full border-2 border-white shadow-sm md:-left-[21px]"
                      style={{ backgroundColor: plan.category.color }}
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-800">{plan.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                          <span
                            className="rounded-full px-2 py-1 font-medium"
                            style={{
                              backgroundColor: `${plan.category.color}18`,
                              color: plan.category.color,
                            }}
                          >
                            {plan.category.name}
                          </span>
                          <span>
                            {formatTime(plan.starts_at)} — {formatTime(plan.ends_at)}
                            {localDateString(new Date(plan.ends_at)) !== plan.plan_date ? ' (+1 day)' : ''}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>{formatDuration(plan.duration_seconds)}</span>
                        </div>
                        {plan.notes && (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{plan.notes}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${plan.title}`}
                          onClick={() => {
                            setEditingPlan(plan)
                            setFormOpen(true)
                          }}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${plan.title}`}
                          onClick={() => void deletePlan(plan)}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>

      {actionError && (
        <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </p>
      )}
      {formOpen && (
        <PlanFormModal
          plan={editingPlan}
          planDate={planDate}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
