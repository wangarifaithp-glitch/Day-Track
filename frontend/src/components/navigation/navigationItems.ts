import {
  CircleGauge,
  Clock3,
  Repeat2,
  ListChecks,
  CalendarDays,
  CalendarRange,
  TimerReset,
  Sparkles,
  NotebookPen,
  Target,
} from 'lucide-react'
import type { NavigationItem } from '../../types/navigation'

export const navigationItems: NavigationItem[] = [
  { label: 'Overview', path: '/', icon: CircleGauge },
  { label: 'My Timeline', path: '/timeline', icon: Clock3 },
  { label: 'Calendar', path: '/calendar', icon: CalendarRange },
  { label: 'Routines', path: '/routines', icon: Repeat2 },
  { label: 'Habits', path: '/habits', icon: ListChecks },
  { label: 'Planner', path: '/planner', icon: CalendarDays },
  { label: 'Focus', path: '/focus', icon: TimerReset },
  { label: 'Insights', path: '/insights', icon: Sparkles },
  { label: 'Journal', path: '/journal', icon: NotebookPen },
  { label: 'Goals', path: '/goals', icon: Target },
]
