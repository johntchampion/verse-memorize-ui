import { Navigate, Route, Routes } from 'react-router-dom';
import { tokenIsExpired } from './api/client';
import { useAuth } from './context/auth';
import AllVerses from './routes/AllVerses';
import Login from './routes/Login';
import Onboarding from './routes/Onboarding';
import Practicing from './routes/Practicing';
import Session from './routes/Session';
import Settings from './routes/Settings';
import Signup from './routes/Signup';
import Today from './routes/Today';
import VerseDetail from './routes/VerseDetail';

/** Route guard: no valid JWT → the sign-in screen, except the root, which
    sends signed-out visitors to the welcome flow instead. */
function RequireAuth({ children, fallback = '/login' }: { children: React.ReactNode; fallback?: string }) {
  const { token } = useAuth();
  if (!token || tokenIsExpired(token)) return <Navigate to={fallback} replace />;
  return children;
}

/** Keeps signed-in users out of the auth screens. */
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (token && !tokenIsExpired(token)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<RedirectIfAuthed><Onboarding /></RedirectIfAuthed>} />
      <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
      <Route path="/" element={<RequireAuth fallback="/welcome"><Today /></RequireAuth>} />
      <Route path="/practicing" element={<RequireAuth><Practicing /></RequireAuth>} />
      <Route path="/all" element={<RequireAuth><AllVerses /></RequireAuth>} />
      <Route path="/session" element={<RequireAuth><Session /></RequireAuth>} />
      {/* The old verse-bank screen — now the All tab. */}
      <Route path="/verses" element={<Navigate to="/all" replace />} />
      <Route path="/verses/:id" element={<RequireAuth><VerseDetail /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
