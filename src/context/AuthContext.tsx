import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  api,
  clearSession,
  getToken,
  getUserId,
  setUnauthorizedHandler,
  storeSession,
  tokenIsExpired,
} from '../api/client';
import { AuthContext } from './auth';

/** The persisted session, dropped up front if the JWT is already expired. */
function initialSession(): { token: string | null; userId: string | null } {
  const token = getToken();
  if (!token || tokenIsExpired(token)) {
    clearSession();
    return { token: null, userId: null };
  }
  return { token, userId: getUserId() };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(initialSession);

  // Any 401 from the API clears the session; the route guard then redirects.
  useEffect(() => {
    setUnauthorizedHandler(() => setSession({ token: null, userId: null }));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    storeSession(res.token, res.userId);
    setSession({ token: res.token, userId: res.userId });
  }, []);

  const signup = useCallback(async (email: string, password: string, timezone?: string) => {
    // The server computes day boundaries from this; the browser knows it
    // best, unless the user picked one themselves (onboarding does).
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const res = await api.signup(email, password, tz);
    storeSession(res.token, res.userId);
    setSession({ token: res.token, userId: res.userId });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession({ token: null, userId: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...session, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
