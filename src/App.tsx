import { Navigate, Route, Routes, type Location } from 'react-router-dom'
import { tokenIsExpired } from './api/client'
import NavStack from './components/NavStack'
import { useAuth } from './context/auth'
import AllVerses from './routes/AllVerses'
import Login from './routes/Login'
import Onboarding from './routes/onboarding/Onboarding'
import ForgotPassword from './routes/ForgotPassword'
import Practicing from './routes/Practicing'
import Queue from './routes/Queue'
import ResetPassword from './routes/ResetPassword'
import Session from './routes/Session'
import Settings from './routes/Settings'
import Signup from './routes/Signup'
import Today from './routes/Today'
import VerseDetail from './routes/VerseDetail'

/**
 * No valid JWT → the sign-in screen, or the welcome flow from the root. Once a
 * session has ended under us the fallback is ignored: a revoked token still
 * satisfies tokenIsExpired (which only reads `exp`), so the root would
 * otherwise drop a returning user into onboarding the moment a password reset
 * elsewhere expired their session.
 */
function RequireAuth({ children, fallback = '/login' }: { children: React.ReactNode; fallback?: string }) {
  const { token, signedOut } = useAuth()
  if (!token || tokenIsExpired(token)) {
    return <Navigate to={signedOut ? '/login' : fallback} replace />
  }
  return children
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (token && !tokenIsExpired(token)) return <Navigate to='/' replace />
  return children
}

/** Matched against the location it is handed, not the current one, so a screen
    animating away keeps rendering itself and its own params. */
function AppRoutes({ location }: { location: Location }) {
  return (
    <Routes location={location}>
      <Route path='/welcome' element={<RedirectIfAuthed><Onboarding /></RedirectIfAuthed>} />
      <Route path='/login' element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      <Route path='/signup' element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
      <Route path='/forgot-password' element={<RedirectIfAuthed><ForgotPassword /></RedirectIfAuthed>} />
      {/* Unguarded on purpose: the emailed link often opens in a browser that
          is still signed in, and RedirectIfAuthed would bounce it to Today. */}
      <Route path='/reset-password' element={<ResetPassword />} />
      <Route path='/' element={<RequireAuth fallback='/welcome'><Today /></RequireAuth>} />
      <Route path='/practicing' element={<RequireAuth><Practicing /></RequireAuth>} />
      <Route path='/queue' element={<RequireAuth><Queue /></RequireAuth>} />
      <Route path='/all' element={<RequireAuth><AllVerses /></RequireAuth>} />
      <Route path='/session' element={<RequireAuth><Session /></RequireAuth>} />
      {/* The old verse-bank screen — now the All tab. */}
      <Route path='/verses' element={<Navigate to='/all' replace />} />
      <Route path='/verses/:id' element={<RequireAuth><VerseDetail /></RequireAuth>} />
      <Route path='/settings' element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  )
}

export default function App() {
  return <NavStack render={(location) => <AppRoutes location={location} />} />
}
