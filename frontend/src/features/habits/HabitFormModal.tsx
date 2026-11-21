import { useEffect, useState } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { getErrorMessage } from '../../services/apiClient'
import { habitService } from './habitService'
import type { Habit, HabitDraft } from './types'

type HabitFormModalProps = {
  habit?: Habit
  onClose: () => void
  onSaved: () => Promise<void>
}

export function HabitFormModal({ habit, onClose, onSaved }: HabitFormModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(habit?.name ?? '')
    setDescription(habit?.description ?? '')
    setError(null)
  }, [habit])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const payload: HabitDraft = {
      name: name.trim(),
      description: description.trim() || null,
    }

    setBusy(true)
    try {
      if (habit) {
        await habitService.update(habit.id, payload)
      } else {
        await habitService.create(payload)
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
        aria-labelledby="habit-form-title"
        className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Small steps, lasting change
            </p>
            <h2 id="habit-form-title" className="mt-1 text-xl font-semibold text-slate-900">
              {habit ? 'Edit habit' : 'Create a habit'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close habit form"
            onClick={onClose}
            disabled={busy}
            className="grid size-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(event) => void save(event)} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Habit name</span>
            <input
              autoFocus
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="What would you like to do regularly?"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              A little detail <span className="font-normal text-slate-400">· optional</span>
            </span>
            <textarea
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a reminder or make the habit more specific..."
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            />
          </label>

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
              {habit ? 'Save changes' : 'Add habit'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
