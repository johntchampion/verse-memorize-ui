import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import { useAuth } from '../context/auth';
import AppIcon from '../components/AppIcon';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password is at least 8 characters.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-logo">
        <AppIcon />
      </div>
      <h1 className="auth-title">Welcome back.</h1>
      <p className="muted" style={{ fontWeight: 600, marginBottom: 26 }}>
        Pick up today&rsquo;s practice where you left off.
      </p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="small muted" style={{ fontWeight: 700, marginTop: 20 }}>
        New here? <Link to="/signup">Create an account</Link>
      </p>
      <Alert
        open={error !== null}
        title="Couldn&rsquo;t sign in"
        message={error ?? ''}
        primaryLabel="OK"
        onPrimary={() => setError(null)}
        onClose={() => setError(null)}
      />
    </main>
  );
}
