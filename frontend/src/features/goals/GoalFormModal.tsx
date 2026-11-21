import { useEffect, useState } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { getErrorMessage } from '../../services/apiClient'
import { goalService } from './goalService'
import type { Goal, GoalDraft, GoalStatus } from './types'

type GoalFormModalProps = {
  goal?: Goal
  onClose: () => void
  onSaved: () => Promise<void>
}

export function GoalFormModal({ goal, onClose, onSaved }: GoalFormModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<GoalStatus>('active')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTitle(goal?.title ?? '')
    setDescription(goal?.description ?? '')
    setTargetDate(goal?.target_date ?? '')
    setProgress(goal?.progress_percent ?? 0)
    setStatus(goal?.status ?? 'active')
    setError(null)
  }, [goal])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const payload: GoalDraft = {
      title: title.trim(),
      description: description.trim() || null,
      target_date: targetDate || null,
      progress_percent: progress,
      status,
    }

    setBusy(true)
    try {
      if (goal) {
        await goalService.update(goal.id, payload)
      } else {
        await goalService.create(payload)
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
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-form-title"
        className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
              Small steps, meaningful change
            </p>
            <h2 id="goal-form-title" className="mt-1 text-xl font-semibold text-slate-900">
              {goal ? 'Edit goal' : 'Create a goal'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close goal form"
            onClick={onClose}
            disabled={busy}
            className="grid size-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(event) => void save(event)} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Goal</span>
            <input
              autoFocus
              required
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What would you like to work toward?"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Why it matters <span className="font-normal text-slate-400">· optional</span>
            </span>
            <textarea
              rows={3}
              maxLength={5000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a little context or the next step..."
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Target date <span className="font-normal text-slate-400">· optional</span>
              </span>
              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as GoalStatus)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
              >
                <option value="active">In progress</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="goal-progress" className="text-sm font-medium text-slate-700">Progress</label>
              <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-cyan-800">
                {progress}%
              </span>
            </div>
            <input
              id="goal-progress"
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
              className="mt-3 h-2 w-full cursor-pointer accent-cyan-700"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>Just starting</span>
              <span>There</span>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-10 rounded-xl px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white transition hover:bg-[#245445] disabled:cursor-wait disabled:opacity-60"
            >
              {busy && <LoaderCircle size={15} className="animate-spin" />}
              {goal ? 'Save changes' : 'Create goal'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
