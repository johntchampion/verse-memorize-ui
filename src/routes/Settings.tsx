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

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
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
      <header className="screen-header" style={{ marginBottom: 0 }}>
        <Link to="/" className="icon-btn" aria-label="Back to home">
          ←
        </Link>
        <h1>Settings</h1>
      </header>

      <section className="card" aria-label="Account">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="avatar" aria-hidden="true">
            {data.user.email.charAt(0).toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', overflowWrap: 'anywhere' }}>
              {data.user.email}
            </div>
            <div className="small muted" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
              Member since {memberSince(data.user.createdAt)}
            </div>
          </div>
        </div>
        <div className="stat-tiles" style={{ marginTop: 14 }}>
          <div className="stat-tile">
            <div className="stat-tile-big">{data.sessionsCompleted}</div>
            <div className="stat-tile-label">
              {data.sessionsCompleted === 1 ? 'session' : 'sessions'}
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-big">{data.versesStarted}</div>
            <div className="stat-tile-label">
              {data.versesStarted === 1 ? 'verse started' : 'verses started'}
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-big">{data.streak}</div>
            <div className="stat-tile-label">day streak</div>
          </div>
        </div>
      </section>

      <section className="card stack" aria-label="Timezone">
        <div>
          <p className="eyebrow">Timezone</p>
          <p className="small muted" style={{ fontWeight: 600, marginTop: 6 }}>
            Sets when your day rolls over — streaks and review due dates follow it.
          </p>
        </div>
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
        {saved && (
          <p className="small" style={{ color: 'var(--green-text)', fontWeight: 800 }}>
            Saved.
          </p>
        )}
        <button className="btn" onClick={() => void save()} disabled={saving || timezone === currentTimezone}>
          {saving ? 'Saving…' : 'Save timezone'}
        </button>
      </section>

      <button className="btn-ghost" onClick={signOut} style={{ color: 'var(--coral-text)' }}>
        Sign out
      </button>
    </main>
  );
}
