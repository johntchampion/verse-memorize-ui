import { createContext, useContext } from 'react'

export interface AuthState {
  token: string | null
  userId: string | null
  /** A session ended under us rather than never existing — the difference
      between a returning user and a first visit, which is what decides whether
      the root falls back to sign-in or to onboarding. */
  signedOut: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, timezone?: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
