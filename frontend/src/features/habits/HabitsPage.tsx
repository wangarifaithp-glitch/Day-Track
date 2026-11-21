import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Flame,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { getErrorMessage } from '../../services/apiClient'
import { formatDateLabel, localDateString, shiftDate } from '../activities/activityUtils'
import { HabitFormModal } from './HabitFormModal'
import { habitService } from './habitService'
import type { Habit, HabitProgress } from './types'

export function HabitsPage() {
  const [habitDate, setHabitDate] = useState(localDateString())
  const [habits, setHabits] = useState<HabitProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [busyHabitId, setBusyHabitId] = useState<string | null>(null)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await habitService.list(habitDate)
      if (currentRequestId === requestId.current) setHabits(result)
    } catch (requestError) {
      if (currentRequestId === requestId.current) setError(getErrorMessage(requestError))
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [habitDate])

  useEffect(() => {
    void reload()
    return () => {
      requestId.current += 1
    }
  }, [reload])

  const completedCount = habits.filter((habit) => habit.is_completed).length
  const activeStreakCount = habits.filter((habit) => habit.current_streak > 0).length
  const progressPercent = habits.length ? Math.round((completedCount / habits.length) * 100) : 0
  const today = localDateString()

  function openCreateForm() {
    setEditingHabit(undefined)
    setFormOpen(true)
  }

  function openEditForm(habit: HabitProgress) {
    setEditingHabit(habit)
    setFormOpen(true)
  }

  async function toggleCompletion(habit: HabitProgress) {
    setBusyHabitId(habit.id)
    setActionError(null)
    try {
      if (habit.is_completed) {
        await habitService.clearCompletion(habit.id, habitDate)
      } else {
        await habitService.markComplete(habit.id, habitDate)
      }
      await reload()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setBusyHabitId(null)
    }
  }

  async function deleteHabit(habit: Habit) {
    if (!window.confirm(`Delete “${habit.name}” and its completion history? This cannot be undone.`)) return
    setBusyHabitId(habit.id)
    setActionError(null)
    try {
      await habitService.delete(habit.id)
      await reload()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setBusyHabitId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-400">Small steps, steady progress</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">Your habits</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            Build consistency at your own pace. Check in on any day and keep your progress visible.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245445] sm:self-auto"
        >
          <Plus size={17} />
          Add a habit
        </button>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setHabitDate((current) => shiftDate(current, -1))}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <ChevronLeft size={18} />
          </button>
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
            <span className="sr-only">Select habit date</span>
            <input
              type="date"
              aria-label="Select habit date"
              value={habitDate}
              onChange={(event) => setHabitDate(event.target.value)}
              className="min-w-0 bg-transparent outline-none"
            />
          </label>
          <button
            type="button"
            aria-label="Next day"
            onClick={() => setHabitDate((current) => shiftDate(current, 1))}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <ChevronRight size={18} />
          </button>
          {habitDate !== today && (
            <button
              type="button"
              onClick={() => setHabitDate(today)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              <RotateCcw size={13} />
              Today
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500">{formatDateLabel(habitDate)}</p>
      </div>

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
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
            <Sparkles size={19} />
          </span>
          <span>
            <span className="block text-xs font-medium text-slate-400">Habits to build</span>
            <span className="mt-0.5 block text-xl font-semibold tabular-nums text-slate-900">{habits.length}</span>
          </span>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
            <CheckCheck size={19} />
          </span>
          <span>
            <span className="block text-xs font-medium text-slate-400">Completed this day</span>
            <span className="mt-0.5 block text-xl font-semibold tabular-nums text-slate-900">
              {completedCount}<span className="text-sm font-medium text-slate-400"> / {habits.length}</span>
            </span>
          </span>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700">
            <Flame size={19} />
          </span>
          <span>
            <span className="block text-xs font-medium text-slate-400">Streaks in progress</span>
            <span className="mt-0.5 block text-xl font-semibold tabular-nums text-slate-900">{activeStreakCount}</span>
          </span>
        </Card>
      </div>

      {actionError && (
        <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </p>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold text-slate-900">Your daily check-in</h2>
            <p className="mt-1 text-xs text-slate-400">
              {completedCount} of {habits.length} complete · {progressPercent}% for {formatDateLabel(habitDate)}
            </p>
          </div>
          {loading && (
            <span role="status" className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <LoaderCircle size={13} className="animate-spin" />
              Updating
            </span>
          )}
        </div>

        <div className="p-4 sm:p-6">
          <div
            className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Daily habit completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {loading && habits.length === 0 && !error ? (
            <div role="status" className="grid min-h-56 place-items-center text-sm text-slate-400">
              <span className="inline-flex items-center gap-2">
                <LoaderCircle size={17} className="animate-spin" />
                Loading your habits…
              </span>
            </div>
          ) : habits.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eef4ef] text-[#54806d]">
                  <Sparkles size={21} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-800">Start with one small habit</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                  Add something you want to practice, then check it off on the days you do it.
                </p>
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#173a32] px-3.5 text-sm font-semibold text-white transition hover:bg-[#245445]"
                >
                  <Plus size={15} />
                  Create your first habit
                </button>
              </div>
            </div>
          ) : (
            <ul className="grid items-stretch gap-3 md:grid-cols-2">
              {habits.map((habit) => {
                const busy = busyHabitId === habit.id
                return (
                  <li key={habit.id} className="min-w-0">
                    <article className={`flex h-full flex-col rounded-2xl border p-4 transition-colors sm:p-5 ${
                      habit.is_completed ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100 bg-white'
                    }`}>
                      <div className="flex items-start gap-3">
                        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                          habit.is_completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {habit.is_completed ? <Check size={19} /> : <Sparkles size={18} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-base font-semibold leading-6 text-slate-900">{habit.name}</h3>
                          {habit.description && (
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-500">
                              {habit.description}
                            </p>
                          )}
                        </div>
                        <span
                          aria-label={`${habit.current_streak} day streak`}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold tabular-nums text-orange-800"
                        >
                          <Flame size={13} />
                          {habit.current_streak}
                        </span>
                      </div>

                      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => void toggleCompletion(habit)}
                          disabled={busy}
                          className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition disabled:opacity-50 ${
                            habit.is_completed
                              ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                              : 'bg-[#173a32] text-white hover:bg-[#245445]'
                          }`}
                        >
                          {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}
                          {habit.is_completed ? 'Done · undo' : 'Mark complete'}
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit ${habit.name}`}
                          onClick={() => openEditForm(habit)}
                          disabled={busy}
                          className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${habit.name}`}
                          onClick={() => void deleteHabit(habit)}
                          disabled={busy}
                          className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Card>

      {formOpen && (
        <HabitFormModal
          habit={editingHabit}
          onClose={() => {
            setFormOpen(false)
            setEditingHabit(undefined)
          }}
          onSaved={reload}
        />
      )}
    </div>
  )
}
