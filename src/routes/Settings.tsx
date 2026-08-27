import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/auth';
import { useApi } from '../hooks/useApi';

function timezoneOptions(current: string): string[] {
  const zones =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return zones.includes(current) ? zones : [current, ...zones];
}

export default function Settings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(() => api.me());

  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const currentTimezone = data?.user.timezone ?? 'UTC';
  const zones = useMemo(() => timezoneOptions(currentTimezone), [currentTimezone]);
  const timezone = selected ?? currentTimezone;

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.updateTimezone(timezone);
      setSaved(true);
      setSelected(null);
      refetch();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the timezone.');
    } finally {
      setSaving(false);
    }
  }

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return (
      <main className="shell">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="shell stack">
        <p className="error-text">{error ?? 'Something went wrong.'}</p>
        <button className="btn-ghost" onClick={refetch}>Try again</button>
      </main>
    );
  }

  return (
    <main className="shell stack">
      <header className="screen-header">
        <Link to="/" className="back-link">← Home</Link>
        <h1>Settings</h1>
      </header>

      <section className="card stack" aria-label="Account">
        <p className="eyebrow">Account</p>
        <p>{data.user.email}</p>
        <p className="small muted">
          {data.sessionsCompleted} {data.sessionsCompleted === 1 ? 'session' : 'sessions'} completed ·{' '}
          {data.versesStarted} {data.versesStarted === 1 ? 'verse' : 'verses'} started
        </p>
      </section>

      <section className="card stack" aria-label="Timezone">
        <p className="eyebrow">Timezone</p>
        <p className="small muted">
          Sets when your day rolls over — streaks and review due dates follow it.
        </p>
        <div className="field">
          <label htmlFor="timezone">Timezone</label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => {
              setSelected(e.target.value);
              setSaved(false);
            }}
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>
        {saveError && <p className="error-text" role="alert">{saveError}</p>}
        {saved && <p className="small" style={{ color: 'var(--gilt)', fontWeight: 600 }}>Saved.</p>}
        <button className="btn" onClick={() => void save()} disabled={saving || timezone === currentTimezone}>
          {saving ? 'Saving…' : 'Save timezone'}
        </button>
      </section>

      <button className="btn-ghost" onClick={signOut} style={{ color: 'var(--carmine)' }}>
        Sign out
      </button>
    </main>
  );
}
