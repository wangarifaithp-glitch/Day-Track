const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json()) as {
      detail?: string | { loc?: (string | number)[]; msg?: string }[]
    }
    const detail = Array.isArray(body.detail)
      ? body.detail.map((issue) => issue.msg).filter(Boolean).join(' ')
      : body.detail
    throw new Error(detail || `Request failed (${response.status}).`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
