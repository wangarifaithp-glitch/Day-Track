import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { Card } from '../../components/ui/Card'
import { getErrorMessage } from '../../services/apiClient'
import { localDateString } from '../activities/activityUtils'
import { journalService } from './journalService'
import type { JournalEntry, JournalEntryDraft } from './types'

function formatEntryDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setHours(0, 0, 0, 0)
  date.setFullYear(year, month - 1, day)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function sortEntries(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) =>
    b.entry_date.localeCompare(a.entry_date) || b.updated_at.localeCompare(a.updated_at),
  )
}

export function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [entryDate, setEntryDate] = useState(localDateString())
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await journalService.list()
      if (currentRequestId === requestId.current) setEntries(result)
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

  function startNewEntry() {
    setSelectedEntryId(null)
    setEntryDate(localDateString())
    setTitle('')
    setContent('')
    setFormError(null)
    setNotice(null)
  }

  function selectEntry(entry: JournalEntry) {
    setSelectedEntryId(entry.id)
    setEntryDate(entry.entry_date)
    setTitle(entry.title ?? '')
    setContent(entry.content)
    setFormError(null)
    setNotice(null)
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    const payload: JournalEntryDraft = {
      entry_date: entryDate,
      title: title.trim() || null,
      content: content.trim(),
    }

    setSaving(true)
    try {
      const saved = selectedEntryId
        ? await journalService.update(selectedEntryId, payload)
        : await journalService.create(payload)
      setEntries((current) => sortEntries([
        ...current.filter((entry) => entry.id !== saved.id),
        saved,
      ]))
      setSelectedEntryId(saved.id)
      setEntryDate(saved.entry_date)
      setTitle(saved.title ?? '')
      setContent(saved.content)
      setNotice(selectedEntryId ? 'Your changes are saved.' : 'Your journal entry is saved.')
    } catch (requestError) {
      setFormError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry() {
    if (!selectedEntryId || !window.confirm('Delete this journal entry? This cannot be undone.')) return
    setDeleting(true)
    setFormError(null)
    setNotice(null)
    try {
      await journalService.delete(selectedEntryId)
      setEntries((current) => current.filter((entry) => entry.id !== selectedEntryId))
      startNewEntry()
      setNotice('Journal entry deleted.')
    } catch (requestError) {
      setFormError(getErrorMessage(requestError))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-400">A little space for your thoughts</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">Your journal</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            Write about your day, save what matters, and come back to it whenever you need.
          </p>
        </div>
        <button
          type="button"
          onClick={startNewEntry}
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245445] sm:self-auto"
        >
          <Plus size={17} />
          New entry
        </button>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <Card className="min-w-0 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef4ef] text-[#54806d]">
              {selectedEntryId ? <Pencil size={18} /> : <FileText size={18} />}
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900">{selectedEntryId ? 'Edit your entry' : 'Write an entry'}</h2>
              <p className="text-xs text-slate-400">Saved to this development workspace.</p>
            </div>
          </div>

          <form onSubmit={(event) => void saveEntry(event)} className="space-y-4 p-5 sm:p-6">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Entry date</span>
              <span className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15">
                <CalendarDays size={16} className="shrink-0 text-[#54806d]" />
                <input
                  type="date"
                  aria-label="Entry date"
                  required
                  value={entryDate}
                  onChange={(event) => setEntryDate(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Title <span className="font-normal text-slate-400">· optional</span>
              </span>
              <input
                type="text"
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Give this entry a title"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Your thoughts</span>
              <textarea
                required
                rows={12}
                maxLength={50000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="What stood out today? How are you feeling? Start anywhere..."
                className="min-h-64 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              />
              <span className="mt-1 block text-right text-xs text-slate-400">{content.length.toLocaleString()} / 50,000</span>
            </label>

            {formError && (
              <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {formError}
              </p>
            )}
            {notice && <p role="status" className="text-sm font-medium text-emerald-800">{notice}</p>}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              {selectedEntryId ? (
                <button
                  type="button"
                  onClick={() => void deleteEntry()}
                  disabled={saving || deleting}
                  className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  {deleting ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  Delete entry
                </button>
              ) : <span />}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                {selectedEntryId && (
                  <button
                    type="button"
                    onClick={startNewEntry}
                    disabled={saving || deleting}
                    className="h-10 rounded-xl px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cancel editing
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || deleting || !content.trim()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#173a32] px-4 text-sm font-semibold text-white transition hover:bg-[#245445] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Saving…' : selectedEntryId ? 'Save changes' : 'Save entry'}
                </button>
              </div>
            </div>
          </form>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">Your entries</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {entries.length} {entries.length === 1 ? 'reflection' : 'reflections'} saved
              </p>
            </div>
            {loading && <LoaderCircle size={16} className="animate-spin text-slate-400" aria-label="Loading entries" />}
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            {error ? (
              <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                <div className="flex items-start gap-2">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <p className="min-w-0 flex-1">{error}</p>
                </div>
                <button type="button" onClick={() => void reload()} className="mt-3 font-semibold underline">
                  Try again
                </button>
              </div>
            ) : loading && entries.length === 0 ? (
              <div role="status" className="grid min-h-48 place-items-center text-sm text-slate-400">
                Loading your entries…
              </div>
            ) : entries.length === 0 ? (
              <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center">
                <div>
                  <span className="mx-auto grid size-11 place-items-center rounded-xl bg-[#eef4ef] text-[#54806d]">
                    <FileText size={19} />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-slate-800">Your story starts here</h3>
                  <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
                    Write your first entry whenever you are ready. You can return to edit it later.
                  </p>
                </div>
              </div>
            ) : (
              <ol className="space-y-2">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      aria-pressed={selectedEntryId === entry.id}
                      onClick={() => selectEntry(entry)}
                      className={`w-full rounded-xl border p-3.5 text-left transition ${
                        selectedEntryId === entry.id
                          ? 'border-[#9bb9a8] bg-[#f3f7f4]'
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#54806d]">
                        <Clock3 size={13} />
                        {formatEntryDate(entry.entry_date)}
                      </span>
                      <span className="mt-1.5 block break-words text-sm font-semibold text-slate-800">
                        {entry.title || formatEntryDate(entry.entry_date)}
                      </span>
                      <span className="mt-1 line-clamp-3 block whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">
                        {entry.content}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
