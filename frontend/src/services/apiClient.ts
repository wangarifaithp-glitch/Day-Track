export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')
const apiUrlIsLocal =
  configuredApiUrl !== undefined &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(configuredApiUrl)
const normalizedApiUrl = configuredApiUrl
  ? /\/api\/v1$/i.test(configuredApiUrl)
    ? configuredApiUrl
    : `${configuredApiUrl}/api/v1`
  : ''
const defaultApiUrl = import.meta.env.DEV
  ? 'http://127.0.0.1:8000/api/v1'
  : 'https://day-track.onrender.com/api/v1'
const API_BASE_URL =
  normalizedApiUrl || defaultApiUrl
const API_CONFIGURATION_ERROR =
  !import.meta.env.DEV && apiUrlIsLocal
    ? 'VITE_API_URL points to localhost in the production build. Set it to the public backend URL ending in /api/v1.'
    : ''

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (API_CONFIGURATION_ERROR) {
    throw new ApiError(API_CONFIGURATION_ERROR, 0)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        'Could not reach the DAYTRACK API. Check your connection, API URL, and backend CORS settings.',
        0,
      )
    }
    throw error
  }

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('daywise-session-expired'))
    }
    const body = (await response.json()) as {
      detail?: string | { loc?: (string | number)[]; msg?: string }[]
    }
    const detail = Array.isArray(body.detail)
      ? body.detail.map((issue) => issue.msg).filter(Boolean).join(' ')
      : body.detail
    throw new ApiError(detail || `Request failed (${response.status}).`, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
