import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CircleCheck,
  CirclePause,
  Clock3,
  LoaderCircle,
  Plus,
  Target,
  Trash2,
  Pencil,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { getErrorMessage } from '../../services/apiClient'
import { GoalFormModal } from './GoalFormModal'
import { goalService } from './goalService'
import type { Goal, GoalFilter } from './types'

const FILTERS: { id: GoalFilter; label: string }[] = [
  { id: 'all', label: 'All goals' },
  { id: 'active', label: 'In progress' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' },
]

function localDateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dateLabel(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setHours(0, 0, 0, 0)
  date.setFullYear(year, month - 1, day)
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function statusStyle(status: Goal['status']): string {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-800'
  if (status === 'paused') return 'bg-amber-50 text-amber-800'
  return 'bg-cyan-50 text-cyan-800'
}

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [filter, setFilter] = useState<GoalFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [busyGoalId, setBusyGoalId] = useState<string | null>(null)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await goalService.list()
      if (currentRequestId === requestId.current) setGoals(result)
    } catch (requestError) {
      if (currentRequestId === requestId.current) setError(getErrorMessage(requestError))
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    return () => {
      requestId.current += 1
    }
  }, [reload])

  const visibleGoals = useMemo(
    () => goals.filter((goal) => filter === 'all' || goal.status === filter),
    [filter, goals],
  )
  const activeCount = goals.filter((goal) => goal.status === 'active').length
  const completedCount = goals.filter((goal) => goal.status === 'completed').length
  const today = localDateKey(new Date())

  function openCreateForm() {
    setEditingGoal(undefined)
    setFormOpen(true)
  }

  function openEditForm(goal: Goal) {
    setEditingGoal(goal)
    setFormOpen(true)
  }

  async function toggleComplete(goal: Goal) {
    setBusyGoalId(goal.id)
    setActionError(null)
    try {
      await goalService.update(
        goal.id,
        goal.status === 'completed'
          ? { status: 'active' }
          : { status: 'completed', progress_percent: 100 },
      )
      await reload()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setBusyGoalId(null)
    }
  }

  async function deleteGoal(goal: Goal) {
    if (!window.confirm(`Delete “${goal.title}”? This cannot be undone.`)) return
    setBusyGoalId(goal.id)
    setActionError(null)
    try {
      await goalService.delete(goal.id)
      await reload()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setBusyGoalId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-400">Progress that fits your life</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">Your goals</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            Keep the things you care about visible, and move toward them one step at a time.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245445] sm:self-auto"
        >
          <Plus size={17} />
          Add a goal
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" onClick={() => void reload()} className="shrink-0 font-semibold underline">
            Try again
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
            <Target size={19} />
          </span>
          <span>
            <span className="block text-xs font-medium text-slate-400">Goals in view</span>
            <span className="mt-0.5 block text-xl font-semibold tabular-nums text-slate-900">{goals.length}</span>
          </span>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <ArrowUpRight size={19} />
          </span>
          <span>
            <span className="block text-xs font-medium text-slate-400">In progress</span>
            <span className="mt-0.5 block text-xl font-semibold tabular-nums text-slate-900">{activeCount}</span>
          </span>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
            <Check size={19} />
          </span>
          <span>
            <span className="block text-xs font-medium text-slate-400">Completed</span>
            <span className="mt-0.5 block text-xl font-semibold tabular-nums text-slate-900">{completedCount}</span>
          </span>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
          {FILTERS.map((item) => {
            const count = item.id === 'all'
              ? goals.length
              : goals.filter((goal) => goal.status === item.id).length
            return (
              <button
                type="button"
                key={item.id}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                  filter === item.id
                    ? 'bg-[#e8f0ec] text-[#173a32]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {item.label}
                <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
              </button>
            )
          })}
        </div>
        {loading && <span role="status" className="inline-flex items-center gap-1.5 text-xs text-slate-400"><LoaderCircle size={13} className="animate-spin" />Updating</span>}
      </div>

      {actionError && (
        <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </p>
      )}

      {loading && goals.length === 0 && !error ? (
        <div className="grid min-h-64 place-items-center rounded-3xl border border-slate-200 bg-white text-sm text-slate-400" role="status">
          <span className="inline-flex items-center gap-2"><LoaderCircle size={17} className="animate-spin" />Loading your goals…</span>
        </div>
      ) : visibleGoals.length === 0 ? (
        <Card className="grid min-h-72 place-items-center border-dashed p-6 text-center">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eef4ef] text-[#54806d]">
              <Target size={21} />
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-800">
              {goals.length === 0 ? 'Start with something that matters to you' : `No ${filter === 'all' ? '' : `${filter} `}goals here`}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {goals.length === 0
                ? 'Add a goal, choose a target date if you have one, and keep your progress in view.'
                : 'Try another filter, or add a new goal to your list.'}
            </p>
            {goals.length === 0 ? (
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#173a32] px-3.5 text-sm font-semibold text-white transition hover:bg-[#245445]"
              >
                <Plus size={15} /> Create your first goal
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
              >
                Show all goals
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleGoals.map((goal) => {
            const overdue = goal.status === 'active' && goal.target_date !== null && goal.target_date < today
            const busy = busyGoalId === goal.id
            return (
              <Card key={goal.id} className="flex min-w-0 flex-col p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${
                    goal.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-800'
                      : goal.status === 'paused'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-cyan-50 text-cyan-700'
                  }`}>
                    {goal.status === 'completed'
                      ? <CircleCheck size={19} />
                      : goal.status === 'paused'
                        ? <CirclePause size={19} />
                        : <Target size={19} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 flex-1 break-words text-base font-semibold leading-6 text-slate-900">
                        {goal.title}
                      </h2>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyle(goal.status)}`}>
                        {goal.status === 'active' ? 'In progress' : goal.status === 'paused' ? 'Paused' : 'Completed'}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-slate-500">
                        {goal.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-500">Progress</span>
                    <span className="font-semibold tabular-nums text-slate-700">{goal.progress_percent}%</span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`${goal.title} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={goal.progress_percent}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        goal.status === 'completed' ? 'bg-emerald-500' : 'bg-cyan-600'
                      }`}
                      style={{ width: `${goal.progress_percent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex min-h-5 items-center gap-1.5 text-xs">
                  {goal.target_date ? (
                    <>
                      <Clock3 size={13} className={overdue ? 'text-rose-600' : 'text-slate-400'} />
                      <span className={overdue ? 'font-medium text-rose-700' : 'text-slate-500'}>
                        {overdue ? 'Target passed · ' : 'Target · '}{dateLabel(goal.target_date)}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400">No target date</span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => void toggleComplete(goal)}
                    disabled={busy}
                    className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition disabled:opacity-50 ${
                      goal.status === 'completed'
                        ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        : 'bg-[#e8f0ec] text-[#173a32] hover:bg-[#dce9e1]'
                    }`}
                  >
                    {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                    {goal.status === 'completed' ? 'Reopen' : 'Mark complete'}
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit ${goal.title}`}
                    onClick={() => openEditForm(goal)}
                    disabled={busy}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${goal.title}`}
                    onClick={() => void deleteGoal(goal)}
                    disabled={busy}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {formOpen && (
        <GoalFormModal
          goal={editingGoal}
          onClose={() => {
            setFormOpen(false)
            setEditingGoal(undefined)
          }}
          onSaved={reload}
        />
      )}
    </div>
  )
}
