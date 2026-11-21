import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { ApiError, apiRequest, getErrorMessage } from '../services/apiClient'

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'error'

export function RequireAuth() {
  const [status, setStatus] = useState<AuthStatus>(
    import.meta.env.DEV ? 'authenticated' : 'checking',
  )
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')

  const checkSession = useCallback(async () => {
    if (import.meta.env.DEV) return
    setStatus('checking')
    setError('')
    try {
      await apiRequest('/auth/me')
      setStatus('authenticated')
    } catch (sessionError) {
      if (sessionError instanceof ApiError && sessionError.status === 401) {
        setStatus('unauthenticated')
      } else {
        setError(getErrorMessage(sessionError))
        setStatus('error')
      }
    }
  }, [])

  useEffect(() => {
    void checkSession()
  }, [attempt, checkSession])

  useEffect(() => {
    const handleExpiredSession = () => setStatus('unauthenticated')
    window.addEventListener('daywise-session-expired', handleExpiredSession)
    return () => window.removeEventListener('daywise-session-expired', handleExpiredSession)
  }, [])

  if (status === 'authenticated') return <Outlet />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-slate-900">Couldn’t verify your session</h1>
          <p role="alert" className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-4 rounded-xl bg-[#173a32] px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    )
  }
  return <div className="grid min-h-screen place-items-center text-sm text-slate-400">Checking your session…</div>
}
