import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ActivitiesPage } from '../features/activities/ActivitiesPage'
import { PlannerPage } from '../features/planner/PlannerPage'
import { PlaceholderPage } from '../features/placeholder/PlaceholderPage'
import { AuthPage } from '../features/auth/AuthPage'

const CalendarPage = lazy(() =>
  import('../features/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })),
)

const InsightsPage = lazy(() =>
  import('../features/insights/InsightsPage').then((module) => ({ default: module.InsightsPage })),
)

const GoalsPage = lazy(() =>
  import('../features/goals/GoalsPage').then((module) => ({ default: module.GoalsPage })),
)

const JournalPage = lazy(() =>
  import('../features/journal/JournalPage').then((module) => ({ default: module.JournalPage })),
)

const HabitsPage = lazy(() =>
  import('../features/habits/HabitsPage').then((module) => ({ default: module.HabitsPage })),
)

const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)

const ProfilePage = lazy(() =>
  import('../features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })),
)

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="timeline" element={<ActivitiesPage />} />
        <Route path="routines" element={<PlaceholderPage title="Routines" />} />
        <Route
          path="habits"
          element={
            <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-slate-400">Loading habits…</div>}>
              <HabitsPage />
            </Suspense>
          }
        />
        <Route path="planner" element={<PlannerPage />} />
        <Route
          path="calendar"
          element={
            <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-slate-400">Loading calendar…</div>}>
              <CalendarPage />
            </Suspense>
          }
        />
        <Route path="focus" element={<PlaceholderPage title="Focus" />} />
        <Route
          path="insights"
          element={
            <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-slate-400">Loading insights…</div>}>
              <InsightsPage />
            </Suspense>
          }
        />
        <Route
          path="journal"
          element={
            <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-slate-400">Loading journal…</div>}>
              <JournalPage />
            </Suspense>
          }
        />
        <Route
          path="goals"
          element={
            <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-slate-400">Loading goals…</div>}>
              <GoalsPage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-slate-400">Loading settings…</div>}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-slate-400">Loading profile…</div>}>
              <ProfilePage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
