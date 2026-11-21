import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiRequest, getErrorMessage } from '../../services/apiClient'

type Message = { message: string }
type AuthResponse = {
  user: { id: string; email: string; name: string; is_verified: boolean }
}

function saveLocalProfile(user: AuthResponse['user']) {
  const saved = window.localStorage.getItem('daywise-user-profile')
  let photo: string | null = null
  if (saved) {
    try {
      const profile: unknown = JSON.parse(saved)
      if (
        profile &&
        typeof profile === 'object' &&
        'email' in profile &&
        profile.email === user.email &&
        'photo' in profile &&
        typeof profile.photo === 'string'
      ) {
        photo = profile.photo
      }
    } catch {
      photo = null
    }
  }
  window.localStorage.setItem(
    'daywise-user-profile',
    JSON.stringify({ name: user.name, email: user.email, photo }),
  )
}

export function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const mode = location.pathname.slice(1)
  const isSignUp = mode === 'signup'
  const isForgotPassword = mode === 'forgot-password'
  const isVerifyEmail = mode === 'verify-email'
  const isResetPassword = mode === 'reset-password'
  const token = new URLSearchParams(location.search).get('token') ?? ''

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setError('')
    setNotice('')
    setPassword('')
    setConfirmPassword('')
    if (mode !== 'signup') {
      setFirstName('')
      setLastName('')
    }
  }, [mode, token])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      if (isSignUp) {
        const result = await apiRequest<Message>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: `${firstName} ${lastName}`.trim(),
            email,
            password,
          }),
        })
        setNotice(result.message)
      } else if (isForgotPassword) {
        const result = await apiRequest<Message>('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
        setNotice(result.message)
      } else if (isResetPassword) {
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          return
        }
        const result = await apiRequest<Message>('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token, password }),
        })
        setNotice(result.message)
      } else {
        const result = await apiRequest<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        saveLocalProfile(result.user)
        navigate('/', { replace: true })
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function resendVerification() {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const result = await apiRequest<Message>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setNotice(result.message)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function verifyEmail() {
    setBusy(true)
    setError('')
    try {
      if (!token) throw new Error('Verification link is missing its token.')
      const result = await apiRequest<Message>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
      setNotice(result.message)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  const title = isSignUp
    ? 'Create an account'
    : isForgotPassword
      ? 'Reset your password'
      : isVerifyEmail
        ? 'Verify your email'
        : isResetPassword
          ? 'Choose a new password'
          : 'Welcome back'

  return (
    <main className="grid min-h-screen place-items-center bg-[#1a1d36] px-3 py-4 text-white sm:px-6 sm:py-8">
      <section className="grid w-full max-w-[920px] overflow-hidden rounded-[12px] border border-white/10 bg-[#171b31] shadow-[0_24px_80px_rgba(8,10,28,0.55)] md:min-h-[560px] md:grid-cols-[1.02fr_1fr]">
        <div
          className="relative hidden min-h-full flex-col overflow-hidden p-9 md:flex"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(35,43,94,0.08) 35%, rgba(8,10,24,0.72) 100%), url("/wallpapers/alpine-lake.jpg")',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        >
          <Link to="/" className="relative z-10 flex w-fit items-center gap-2 text-xl font-black tracking-[0.18em]">
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

        <div className="flex min-h-[520px] flex-col px-5 py-7 sm:px-10 md:min-h-0 md:px-12 md:py-12">
          <div className="mb-8 flex items-center md:hidden">
            <Link to="/" className="flex items-center gap-2 text-base font-black tracking-[0.16em]">
              <span className="grid size-8 place-items-center rounded-lg border border-white/40 text-xs tracking-normal">D</span>
              DAYWISE
            </Link>
          </div>

          <h1 className="text-[32px] font-medium leading-tight tracking-[-0.04em] sm:text-[36px]">
            {title}
          </h1>
          <p className="mt-3 text-sm text-white/55">
            {isSignUp ? 'Already have an account?' : !isForgotPassword && !isVerifyEmail && !isResetPassword ? 'New to Daywise?' : 'Secure access to your DAYTRACK account.'}
            {!isForgotPassword && !isVerifyEmail && !isResetPassword && (
              <Link
                to={isSignUp ? '/login' : '/signup'}
                className="ml-1.5 border-b border-white/55 pb-0.5 text-white/75 transition hover:text-white"
              >
                {isSignUp ? 'Log in' : 'Create an account'}
              </Link>
            )}
          </p>

          {isVerifyEmail ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm leading-6 text-white/65">
                Use the verification link sent to your email address to activate your account.
              </p>
              {notice ? (
                <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void verifyEmail()}
                  className="h-12 w-full rounded-lg bg-[#6868d9] text-sm font-semibold text-white transition hover:bg-[#7778e6] disabled:opacity-50"
                >
                  {busy ? 'Verifying…' : 'Verify email'}
                </button>
              )}
              <Link to="/login" className="block text-center text-sm text-white/65 underline underline-offset-4">
                Back to log in
              </Link>
            </div>
          ) : notice && !isVerifyEmail ? (
            <div className="mt-8 space-y-4">
              <p role="status" className="rounded-lg bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">
                {notice}
              </p>
              {isSignUp && (
                <button
                  type="button"
                  disabled={busy || !email}
                  onClick={() => void resendVerification()}
                  className="h-11 w-full rounded-lg border border-white/15 text-sm font-medium text-white/75 hover:bg-white/[0.05] disabled:opacity-50"
                >
                  Resend verification email
                </button>
              )}
              <Link to="/login" className="block text-center text-sm text-white/65 underline underline-offset-4">
                Back to log in
              </Link>
            </div>
          ) : (
            <form className="mt-8 space-y-3" onSubmit={(event) => void submit(event)}>
              {isSignUp && (
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="sr-only">First name</span>
                    <input
                      required
                      maxLength={50}
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="First name"
                      className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7779d8]"
                    />
                  </label>
                  <label>
                    <span className="sr-only">Last name</span>
                    <input
                      maxLength={50}
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Last name"
                      className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7779d8]"
                    />
                  </label>
                </div>
              )}

              {!isResetPassword && (
                <label>
                  <span className="sr-only">Email</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email"
                    className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7779d8]"
                  />
                </label>
              )}

              {!isForgotPassword && (
                <label className="relative block">
                  <span className="sr-only">Password</span>
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignUp || isResetPassword ? 'new-password' : 'current-password'}
                    minLength={isSignUp || isResetPassword ? 8 : undefined}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={isResetPassword ? 'New password' : 'Password'}
                    className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 pr-12 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7779d8]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-white/35 hover:text-white/70"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </label>
              )}

              {(isSignUp || isResetPassword) && (
                <label className="relative block">
                  <span className="sr-only">Confirm password</span>
                  <input
                    required
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm password"
                    className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.035] px-4 pr-12 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7779d8]"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-white/35 hover:text-white/70"
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </label>
              )}

              {!isSignUp && !isForgotPassword && !isResetPassword && (
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-white/50 hover:text-white">
                    Forgot password?
                  </Link>
                </div>
              )}

              {isSignUp && (
                <label className="flex min-h-10 items-center gap-2.5 text-xs text-white/55">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="size-4 rounded border-white/20 accent-[#7779d8]"
                  />
                  <span>I agree to the Terms &amp; Conditions</span>
                </label>
              )}

              {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
              {notice && <p role="status" className="text-sm text-emerald-200">{notice}</p>}

              <button
                type="submit"
                disabled={busy || (isSignUp && !acceptedTerms) || ((isVerifyEmail || isResetPassword) && !token)}
                className="h-12 w-full rounded-lg border border-white/10 bg-[#6868d9] text-sm font-semibold text-white transition hover:bg-[#7778e6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy
                  ? 'Please wait…'
                  : isSignUp
                    ? 'Create account'
                    : isForgotPassword
                      ? 'Send reset link'
                      : isResetPassword
                        ? 'Update password'
                        : 'Log in'}
              </button>
              {isForgotPassword && (
                <Link to="/login" className="block pt-2 text-center text-sm text-white/65 underline underline-offset-4">
                  Back to log in
                </Link>
              )}
              {isResetPassword && !token && (
                <p role="alert" className="text-sm text-rose-300">This reset link is missing its token.</p>
              )}
            </form>
          )}

          {error && isVerifyEmail && (
            <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>
          )}
        </div>
      </section>
    </main>
  )
}
