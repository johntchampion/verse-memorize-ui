import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  api,
  clearSession,
  getToken,
  getUserId,
  setUnauthorizedHandler,
  storeSession,
  tokenIsExpired,
} from '../api/client'
import { AuthContext } from './auth'

/** The persisted session, dropped up front if the JWT is already expired. */
function initialSession(): { token: string | null; userId: string | null } {
  const token = getToken()
  if (!token || tokenIsExpired(token)) {
    clearSession()
    return { token: null, userId: null }
  }
  return { token, userId: getUserId() }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(initialSession)
  const [signedOut, setSignedOut] = useState(false)

  // Any 401 from the API clears the session; the route guard then redirects.
  // The flag is what sends it to sign-in rather than onboarding: a password
  // reset elsewhere revokes this token without touching its `exp`, so the guard
  // can't tell a dead session from a first visit on its own.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession({ token: null, userId: null })
      setSignedOut(true)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    storeSession(res.token, res.userId)
    setSession({ token: res.token, userId: res.userId })
    setSignedOut(false)
  }, [])

  const signup = useCallback(async (email: string, password: string, timezone?: string) => {
    // The server computes day boundaries from this, and the browser knows it
    // best — unless the user picked one themselves, as onboarding does.
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const res = await api.signup(email, password, tz)
    storeSession(res.token, res.userId)
    setSession({ token: res.token, userId: res.userId })
    setSignedOut(false)
  }, [])

  const resetPassword = useCallback(async (token: string, password: string) => {
    // Cleared first: request() attaches the stored bearer token to every call,
    // and a link belonging to a different account would otherwise go out under
    // this browser's session.
    clearSession()
    setSession({ token: null, userId: null })

    const res = await api.resetPassword(token, password)
    storeSession(res.token, res.userId)
    setSession({ token: res.token, userId: res.userId })
    setSignedOut(false)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession({ token: null, userId: null })
    setSignedOut(true)
  }, [])

  return (
    <AuthContext.Provider
      value={{ ...session, signedOut, login, signup, resetPassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
