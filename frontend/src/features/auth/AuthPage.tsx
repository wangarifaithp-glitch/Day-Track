import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.26-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.16.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.21 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.23.07 2.09.66 2.81.71.92-.21 1.8-.66 2.77-.6 1.17.08 2.05.55 2.64 1.39-2.39 1.43-1.82 4.61.45 5.5-.54 1.41-1.25 2.81-2.37 4.06l1.7 1.91ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  )
}

export function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isSignUp = location.pathname === '/signup'
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [provider, setProvider] = useState<'Google' | 'Apple' | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [showEmailEntry, setShowEmailEntry] = useState(false)
  const accounts = ['personal@example.com', 'work@example.com']

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSignUp) {
      const form = event.currentTarget
      const data = new FormData(form)
      const password = String(data.get('password') ?? '')
      const confirmPassword = String(data.get('confirmPassword') ?? '')
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match.')
        return
      }
    }
    setPasswordError('')
    navigate('/')
  }

  function chooseAccount(email: string) {
    setProvider(null)
    setShowEmailEntry(false)
    navigate('/', { state: { authEmail: email, authProvider: provider } })
  }

  function submitAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newEmail.trim()) chooseAccount(newEmail.trim())
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#1a1d36] px-3 py-4 text-white sm:px-6 sm:py-8">
      <section className="grid w-full max-w-[920px] overflow-hidden rounded-[12px] border border-white/10 bg-[#171b31] shadow-[0_24px_80px_rgba(8,10,28,0.55)] md:min-h-[620px] md:grid-cols-[1.02fr_1fr]">
        <div
          className="relative hidden min-h-full flex-col overflow-hidden p-9 md:flex"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(35,43,94,0.08) 35%, rgba(8,10,24,0.72) 100%), url("/wallpapers/alpine-lake.jpg")',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        >
          <Link
            to="/"
            aria-label="Daywise home"
            className="relative z-10 flex w-fit items-center gap-2 text-xl font-black tracking-[0.18em]"
          >
            <span className="grid size-8 place-items-center rounded-lg border border-white/50 text-[13px] tracking-normal">D</span>
            DAYWISE
          </Link>

          <div className="mt-auto text-center">
            <p className="text-[25px] font-medium leading-[1.12] tracking-[-0.03em] text-white">
              Capturing Moments,
              <br />
              Creating Memories
            </p>
            <div className="mt-7 flex justify-center gap-2">
              <span className="h-1 w-10 rounded-full bg-white/35" />
              <span className="h-1 w-4 rounded-full bg-white" />
              <span className="h-1 w-10 rounded-full bg-white/35" />
            </div>
          </div>
        </div>

        <div className="flex min-h-[560px] flex-col px-5 py-7 sm:px-10 md:min-h-0 md:px-[68px] md:py-10 lg:py-[52px]">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <Link to="/" className="flex items-center gap-2 text-base font-black tracking-[0.16em]">
              <span className="grid size-8 place-items-center rounded-lg border border-white/40 text-xs tracking-normal">D</span>
              DAYWISE
            </Link>
          </div>

          <h1 className="text-[36px] font-medium leading-tight tracking-[-0.04em]">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h1>
          <p className="mt-3 text-sm text-white/55">
            {isSignUp ? 'Already have an account?' : 'New to Daywise?'}
            <Link
              to={isSignUp ? '/login' : '/signup'}
              className="ml-1.5 border-b border-white/55 pb-0.5 text-white/75 transition hover:text-white"
            >
              {isSignUp ? 'Log in' : 'Create an account'}
            </Link>
          </p>

          <form className="mt-9 space-y-3" onSubmit={submit}>
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="sr-only">First name</span>
                  <input
                    required
                    name="firstName"
                    placeholder="First name"
                    className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7779d8] focus:ring-2 focus:ring-[#7779d8]/20"
                  />
                </label>
                <label>
                  <span className="sr-only">Last name</span>
                  <input
                    name="lastName"
                    placeholder="Last name"
                    className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7779d8] focus:ring-2 focus:ring-[#7779d8]/20"
                  />
                </label>
              </div>
            )}

            <label>
              <span className="sr-only">Email</span>
              <input
                required
                type="email"
                name="email"
                placeholder="Email"
                className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7779d8] focus:ring-2 focus:ring-[#7779d8]/20"
              />
            </label>

            <label className="relative block">
              <span className="sr-only">Password</span>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                name="password"
                minLength={isSignUp ? 8 : undefined}
                placeholder="Enter your password"
                onChange={() => setPasswordError('')}
                className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 pr-12 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7779d8] focus:ring-2 focus:ring-[#7779d8]/20"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-white/35 transition hover:text-white/70"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </label>

            {isSignUp && (
              <label className="relative block">
                <span className="sr-only">Confirm password</span>
                <input
                  required
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  minLength={8}
                  placeholder="Confirm password"
                  onChange={() => setPasswordError('')}
                  className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 pr-12 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7779d8] focus:ring-2 focus:ring-[#7779d8]/20"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-white/35 transition hover:text-white/70"
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </label>
            )}

            {passwordError && (
              <p role="alert" className="text-xs text-rose-300">
                {passwordError}
              </p>
            )}

            {!isSignUp && (
              <div className="flex justify-end">
                <button type="button" className="text-xs text-white/50 transition hover:text-white">
                  Forgot password?
                </button>
              </div>
            )}

            {isSignUp && (
              <label className="flex h-10 items-center gap-2.5 text-xs text-white/55">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="size-4 rounded border-white/20 accent-[#7779d8]"
                />
                <span>I agree to the Terms &amp; Conditions</span>
              </label>
            )}

            <button
              type="submit"
              disabled={isSignUp && !acceptedTerms}
              className="h-12 w-full rounded-lg border border-white/10 bg-[#6868d9] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(73,73,183,0.18)] transition hover:bg-[#7778e6] focus:outline-none focus:ring-2 focus:ring-[#9a9cf5]/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSignUp ? 'Create account' : 'Log in'}
            </button>
          </form>

          <div className="mt-7 flex items-center gap-4 text-xs text-white/35">
            <span className="h-px flex-1 bg-white/10" />
            Or continue with
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setProvider('Google')
                setShowEmailEntry(false)
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs font-medium text-white/85 transition hover:bg-white/[0.07]"
            >
              <GoogleMark />
              Google
            </button>
            <button
              type="button"
              onClick={() => {
                setProvider('Apple')
                setShowEmailEntry(false)
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs font-medium text-white/85 transition hover:bg-white/[0.07]"
            >
              <AppleMark />
              Apple
            </button>
          </div>
        </div>
      </section>

      {provider && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 grid place-items-end bg-[#090b18]/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProvider(null)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-picker-title"
            className="w-full rounded-t-[20px] border border-white/10 bg-[#20243d] p-5 shadow-[0_-12px_50px_rgba(0,0,0,0.35)] sm:max-w-[420px] sm:rounded-[16px] sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs font-medium text-white/45">Continue with {provider}</p>
                <h2 id="account-picker-title" className="text-xl font-semibold text-white">
                  Choose an account
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close account picker"
                onClick={() => setProvider(null)}
                className="grid size-8 place-items-center rounded-lg text-white/50 hover:bg-white/[0.07] hover:text-white"
              >
                ×
              </button>
            </div>

            {!showEmailEntry ? (
              <div className="space-y-2">
                {accounts.map((email, index) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => chooseAccount(email)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#6868d9] text-sm font-semibold">
                      {email.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">
                        {index === 0 ? 'Personal account' : 'Work account'}
                      </span>
                      <span className="block truncate text-xs text-white/45">{email}</span>
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setShowEmailEntry(true)}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm text-white/75 transition hover:bg-white/[0.05]"
                >
                  <span className="text-xl leading-none">+</span>
                  Use another account
                </button>
              </div>
            ) : (
              <form onSubmit={submitAccount} className="space-y-3">
                <label>
                  <span className="mb-2 block text-xs text-white/55">Email address</span>
                  <input
                    autoFocus
                    required
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder={`name@${provider.toLowerCase()}.com`}
                    className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7779d8]"
                  />
                </label>
                <button type="submit" className="h-12 w-full rounded-lg bg-[#6868d9] text-sm font-semibold text-white transition hover:bg-[#7778e6]">
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailEntry(false)}
                  className="h-10 w-full text-xs text-white/50 transition hover:text-white"
                >
                  Back to accounts
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
