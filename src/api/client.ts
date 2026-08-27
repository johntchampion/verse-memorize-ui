import type {
  AttemptOutcome,
  AuthResponse,
  ExerciseType,
  MeResponse,
  SessionCompleteResponse,
  SessionTodayResponse,
  VerseDetailResponse,
  VersesResponse,
} from './types'

const TOKEN_KEY = 'verse-memorize.token'
const USER_KEY = 'verse-memorize.userId'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// --- Token storage (localStorage so a PWA relaunch stays signed in) --------

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUserId(): string | null {
  return localStorage.getItem(USER_KEY)
}

export function storeSession(token: string, userId: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, userId)
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** Client-side expiry check on the JWT `exp` claim, for the route guard. */
export function tokenIsExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number }
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

// --- Fetch wrapper ----------------------------------------------------------

/** Set by AuthContext so a 401 anywhere logs the user out and redirects. */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(
      0,
      'Network error — check your connection and try again.',
    )
  }

  if (res.status === 401 && !path.startsWith('/auth')) {
    clearSession()
    onUnauthorized?.()
    throw new ApiError(401, 'Your session has expired. Sign in again.')
  }

  const data: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : `Request failed (${res.status})`
    throw new ApiError(res.status, message)
  }

  return data as T
}

// --- Endpoints --------------------------------------------------------------

export const api = {
  signup: (email: string, password: string, timezone: string) =>
    request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: { email, password, timezone },
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  me: () => request<MeResponse>('/api/me'),

  updateTimezone: (timezone: string) =>
    request<MeResponse>('/api/me', { method: 'PATCH', body: { timezone } }),

  sessionToday: () => request<SessionTodayResponse>('/api/session/today'),

  attempt: (
    userVerseId: string,
    exerciseType: ExerciseType,
    correct: boolean,
  ) =>
    request<AttemptOutcome>('/api/attempt', {
      method: 'POST',
      body: { userVerseId, exerciseType, correct },
    }),

  sessionComplete: () =>
    request<SessionCompleteResponse>('/api/session/complete', {
      method: 'POST',
    }),

  verses: () => request<VersesResponse>('/api/verses?orderBy=canon'),

  verse: (id: string) =>
    request<VerseDetailResponse>(`/api/verses/${encodeURIComponent(id)}`),
}
