import type { ReactNode } from 'react'
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../../components/ui/Card'
import { activityService, getErrorMessage } from '../activities/activityService'
import {
  elapsedSeconds,
  formatDateLabel,
  formatDuration,
  localDateString,
  shiftDate,
} from '../activities/activityUtils'
import type { Activity } from '../activities/types'

type Period = 'day' | 'week' | 'month'
type DateRange = { start: string; end: string }
type ChartPoint = { label: string; seconds: number }

const PAGE_SIZE = 100

function getDateRange(anchor: string, period: Period): DateRange {
  if (period === 'day') return { start: anchor, end: anchor }

  const [year, month, day] = anchor.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (period === 'week') {
    const mondayOffset = (date.getDay() + 6) % 7
    const start = shiftDate(anchor, -mondayOffset)
    return clampToToday({ start, end: shiftDate(start, 6) }, anchor)
  }

  const firstDay = localDateString(new Date(year, month - 1, 1))
  const lastDay = localDateString(new Date(year, month, 0))
  return clampToToday({ start: firstDay, end: lastDay }, anchor)
}

function clampToToday(range: DateRange, anchor: string): DateRange {
  const today = localDateString()
  return anchor <= today && range.start <= today && range.end > today
    ? { ...range, end: today }
    : range
}

function shiftAnchor(anchor: string, period: Period, direction: number): string {
  if (period === 'day') return shiftDate(anchor, direction)
  if (period === 'week') return shiftDate(anchor, direction * 7)

  const [year, month, day] = anchor.split('-').map(Number)
  const targetMonth = new Date(year, month - 1 + direction, 1)
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate()
  targetMonth.setDate(Math.min(day, lastDay))
  return localDateString(targetMonth)
}

function listDates(range: DateRange): string[] {
  const result: string[] = []
  for (let date = range.start; date <= range.end; date = shiftDate(date, 1)) {
    result.push(date)
  }
  return result
}

function rangeLabel(range: DateRange, period: Period): string {
  if (period === 'day') return formatDateLabel(range.start)
  if (period === 'month') {
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
      new Date(`${range.start}T12:00:00`),
    )
  }

  const start = new Date(`${range.start}T12:00:00`)
  const end = new Date(`${range.end}T12:00:00`)
  const sameYear = start.getFullYear() === end.getFullYear()
  const startLabel = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(start)
  const endLabel = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(end)
  return `${startLabel} – ${endLabel}`
}

function buildDailyChart(activities: Activity[], dates: string[], now: number): ChartPoint[] {
  const secondsByDate = new Map<string, number>()
  for (const activity of activities) {
    const duration = activity.is_active ? elapsedSeconds(activity, now) : activity.duration_seconds
    secondsByDate.set(activity.activity_date, (secondsByDate.get(activity.activity_date) ?? 0) + duration)
  }

  return dates.map((date) => ({
    label: new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' }).format(
      new Date(`${date}T12:00:00`),
    ),
    seconds: secondsByDate.get(date) ?? 0,
  }))
}

function buildHourlyChart(activities: Activity[], date: string, now: number): ChartPoint[] {
  const [year, month, day] = date.split('-').map(Number)
  const dayStart = new Date(year, month - 1, day).getTime()
  const dayEnd = new Date(year, month - 1, day + 1).getTime()
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    label: hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`,
    seconds: 0,
  }))

  for (const activity of activities) {
    const activityStart = Math.max(new Date(activity.started_at).getTime(), dayStart)
    const activityEnd = Math.min(
      activity.ended_at ? new Date(activity.ended_at).getTime() : now,
      dayEnd,
    )
    for (let hour = 0; hour < buckets.length; hour += 1) {
      const hourStart = new Date(year, month - 1, day, hour).getTime()
      const hourEnd = new Date(year, month - 1, day, hour + 1).getTime()
      const overlap = Math.max(
        0,
        Math.min(activityEnd, hourEnd) - Math.max(activityStart, hourStart),
      )
      buckets[hour].seconds += Math.floor(overlap / 1000)
    }
  }
  return buckets
}

function rangeDayCount(range: DateRange): number {
  return listDates(range).length
}

function formatHoursTick(value: number): string {
  if (value <= 0) return '0'
  if (value < 3600) return `${Math.round(value / 60)}m`
  const hours = value / 3600
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`
}

function StatCard({
  label,
  value,
  detail,
  icon,
  accent,
}: {
  label: string
  value: string
  detail: string
  icon: ReactNode
  accent: 'cyan' | 'blue' | 'violet' | 'mint'
}) {
  const accentClasses = {
    cyan: 'bg-cyan-50 text-cyan-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    mint: 'bg-emerald-50 text-emerald-700',
  }

  return (
    <Card className="flex min-w-0 items-center gap-4 p-4 sm:p-5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${accentClasses[accent]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
      </div>
    </Card>
  )
}

export function InsightsPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [anchorDate, setAnchorDate] = useState(localDateString())
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [now, setNow] = useState(Date.now())
  const range = useMemo(() => getDateRange(anchorDate, period), [anchorDate, period])
  const dates = useMemo(() => listDates(range), [range])

  useEffect(() => {
    let current = true
    async function loadActivities() {
      setLoading(true)
      setError(null)
      setActivities([])
      try {
        const loaded: Activity[] = []
        for (let offset = 0; ; offset += PAGE_SIZE) {
          const page = await activityService.getHistory({
            startDate: range.start,
            endDate: range.end,
            limit: PAGE_SIZE,
            offset,
          })
          loaded.push(...page)
          if (page.length < PAGE_SIZE) break
        }
        if (current) setActivities(loaded)
      } catch (requestError) {
        if (current) setError(getErrorMessage(requestError))
      } finally {
        if (current) setLoading(false)
      }
    }
    void loadActivities()
    return () => {
      current = false
    }
  }, [range.end, range.start, reloadKey])

  useEffect(() => {
    if (!activities.some((activity) => activity.is_active)) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [activities])

  const trackedSeconds = useMemo(
    () =>
      activities.reduce(
        (total, activity) =>
          total + (activity.is_active ? elapsedSeconds(activity, now) : activity.duration_seconds),
        0,
      ),
    [activities, now],
  )
  const categories = useMemo(() => {
    const totals = new Map<string, { name: string; color: string; seconds: number }>()
    for (const activity of activities) {
      const current = totals.get(activity.category_id) ?? {
        name: activity.category.name,
        color: activity.category.color,
        seconds: 0,
      }
      current.seconds += activity.is_active ? elapsedSeconds(activity, now) : activity.duration_seconds
      totals.set(activity.category_id, current)
    }
    return [...totals.entries()]
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.seconds - a.seconds)
  }, [activities, now])
  const chartData = useMemo(
    () => period === 'day'
      ? buildHourlyChart(activities, range.start, now)
      : buildDailyChart(activities, dates, now),
    [activities, dates, now, period, range.start],
  )
  const longestActivity = useMemo(
    () =>
      [...activities].sort((a, b) => {
        const aDuration = a.is_active ? elapsedSeconds(a, now) : a.duration_seconds
        const bDuration = b.is_active ? elapsedSeconds(b, now) : b.duration_seconds
        return bDuration - aDuration
      })[0],
    [activities, now],
  )
  const dayCount = rangeDayCount(range)
  const averageSeconds = dayCount ? Math.round(trackedSeconds / dayCount) : 0
  const trackedDays = new Set(activities.map((activity) => activity.activity_date)).size
  const recentActivities = [...activities]
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-400">
            <Sparkles size={15} className="text-cyan-600" />
            A clearer picture of your time
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">Insights</h1>
          <p className="mt-1 text-sm text-slate-500">See how your days are actually unfolding, without judgment.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1" aria-label="Insights period">
            {(['day', 'week', 'month'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${
                  period === value
                    ? 'bg-[#173a32] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`Previous ${period}`}
              onClick={() => setAnchorDate((date) => shiftAnchor(date, period, -1))}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            >
              <ChevronLeft size={17} />
            </button>
            <div className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <CalendarDays size={15} className="shrink-0 text-cyan-700" />
              <input
                type="date"
                aria-label="Choose insights date"
                value={anchorDate}
                onChange={(event) => setAnchorDate(event.target.value)}
                className="min-w-0 w-full bg-transparent text-xs font-medium text-slate-700 outline-none"
              />
            </div>
            <button
              type="button"
              aria-label={`Next ${period}`}
              onClick={() => setAnchorDate((date) => shiftAnchor(date, period, 1))}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{rangeLabel(range, period)}</p>
        {anchorDate !== localDateString() && (
          <button
            type="button"
            onClick={() => setAnchorDate(localDateString())}
            className="text-xs font-semibold text-cyan-700 transition hover:text-cyan-900"
          >
            Back to today
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
          <p className="text-sm font-semibold text-rose-800">Insights couldn’t load your activity data</p>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-2 text-sm font-semibold text-rose-800 underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          label="Time tracked"
          value={loading ? '—' : formatDuration(trackedSeconds)}
          detail={loading ? 'Loading activity data' : `${activities.length} recorded activities`}
          icon={<Clock3 size={19} />}
          accent="cyan"
        />
        <StatCard
          label="Daily average"
          value={loading ? '—' : formatDuration(averageSeconds)}
          detail={`Across ${dayCount} ${dayCount === 1 ? 'day' : 'days'} in this view`}
          icon={<ActivityIcon size={19} />}
          accent="blue"
        />
        <StatCard
          label="Most tracked"
          value={loading ? '—' : categories[0]?.name ?? '—'}
          detail={categories[0] ? formatDuration(categories[0].seconds) : 'No category data yet'}
          icon={<ArrowUpRight size={19} />}
          accent="violet"
        />
        <StatCard
          label="Days with activity"
          value={loading ? '—' : `${trackedDays} / ${dayCount}`}
          detail={longestActivity ? `Longest: ${longestActivity.title}` : 'Your log is ready when you are'}
          icon={<CalendarDays size={19} />}
          accent="mint"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-slate-900">
              {period === 'day' ? 'Your day by hour' : 'Time tracked each day'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {period === 'day' ? 'Activity duration across the day' : 'Total time recorded in this period'}
            </p>
          </div>
          {loading ? (
            <div className="h-[280px] animate-pulse rounded-xl bg-slate-50" role="status" aria-label="Loading chart" />
          ) : error ? (
            <div className="grid h-[280px] place-items-center text-sm text-slate-400">Chart unavailable.</div>
          ) : activities.length === 0 ? (
            <div className="grid h-[280px] place-items-center rounded-xl bg-slate-50 px-6 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-700">Nothing tracked in this period yet</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Log an activity to start finding your patterns.</p>
              </div>
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke="#64748b" strokeOpacity={0.14} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tick={{ fill: '#8292aa', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatHoursTick}
                    tick={{ fill: '#8292aa', fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#38bdf8', fillOpacity: 0.08 }}
                    formatter={(value) => [formatDuration(Number(value ?? 0)), 'Tracked']}
                    contentStyle={{
                      background: 'var(--tooltip-bg, #ffffff)',
                      border: '1px solid #cbd5e1',
                      borderRadius: 12,
                      color: 'var(--tooltip-text, #0f172a)',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="seconds" fill="#38bdf8" radius={[6, 6, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Where your time went</h2>
            <p className="mt-1 text-xs text-slate-400">Breakdown by activity category</p>
          </div>
          {loading ? (
            <div className="mt-4 h-[240px] animate-pulse rounded-xl bg-slate-50" role="status" aria-label="Loading category breakdown" />
          ) : categories.length === 0 ? (
            <div className="grid min-h-[240px] place-items-center text-center text-sm text-slate-400">
              Category breakdown will appear after you log activities.
            </div>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[165px_minmax(0,1fr)]">
                <div className="h-[170px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories}
                        dataKey="seconds"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {categories.map((category) => <Cell key={category.id} fill={category.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatDuration(Number(value ?? 0)), 'Tracked']}
                        contentStyle={{
                          background: 'var(--tooltip-bg, #ffffff)',
                          border: '1px solid #cbd5e1',
                          borderRadius: 12,
                          color: 'var(--tooltip-text, #0f172a)',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {categories.slice(0, 5).map((category) => {
                    const percentage = trackedSeconds ? Math.round(category.seconds / trackedSeconds * 100) : 0
                    return (
                      <div key={category.id} className="min-w-0">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex min-w-0 items-center gap-2 font-medium text-slate-700">
                            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                            <span className="truncate">{category.name}</span>
                          </span>
                          <span className="shrink-0 text-slate-400">{percentage}%</span>
                        </div>
                        <p className="mt-1 pl-4 text-[11px] text-slate-400">{formatDuration(category.seconds)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
              {categories.length > 5 && (
                <p className="mt-2 text-center text-xs text-slate-400">
                  +{categories.length - 5} more {categories.length - 5 === 1 ? 'category' : 'categories'}
                </p>
              )}
            </>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Recent moments</h2>
            <p className="mt-1 text-xs text-slate-400">The activities behind this view</p>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {loading ? 'Loading…' : `${activities.length} total`}
          </span>
        </div>
        {loading ? (
          <div className="grid min-h-32 place-items-center text-sm text-slate-400" role="status">
            Loading your activities…
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="grid min-h-40 place-items-center px-5 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-700">Your story starts with a single moment.</p>
              <p className="mt-1 text-sm text-slate-500">Once you log activities, you’ll see them reflected here.</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100" aria-label="Recent activities">
            {recentActivities.map((activity) => {
              const duration = activity.is_active ? elapsedSeconds(activity, now) : activity.duration_seconds
              return (
                <li key={activity.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: activity.category.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{activity.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {activity.category.name} · {formatDateLabel(activity.activity_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                    <span>{formatDuration(duration)}{activity.is_active ? ' · in progress' : ''}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
