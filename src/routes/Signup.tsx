import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const { signup } = useAuth();
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
      setError('Use at least 8 characters for your password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signup(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-logo" aria-hidden="true">
        V
      </div>
      <h1 className="auth-title">Hide the word in your heart.</h1>
      <p className="muted" style={{ fontWeight: 600, marginBottom: 26 }}>
        A few minutes a day, three verses at a time, one hundred in all.
      </p>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="small muted">At least 8 characters.</span>
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="small muted" style={{ marginTop: 20 }}>
        Already practicing? <Link to="/login">Sign in</Link>
      </p>
    </main>
  );
}
