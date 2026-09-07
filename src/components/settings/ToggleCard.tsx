import type { ReactNode } from 'react'

interface Props {
  eyebrow: string
  description: ReactNode
  checked: boolean
  busy?: boolean
  /** Replaces the switch when this platform or deployment can't do
      it at all — an explanation is more use than a control that can't work. */
  unavailable?: ReactNode
  /** Sits under the switch when it can work, but something needs saying. */
  hint?: ReactNode
  error?: string | null
  onChange: (next: boolean) => void
  /** Anything that only makes sense once it's on, e.g. a test button. */
  children?: ReactNode
}

/** One on/off account setting. Saves on flip, so unlike PreferenceCard there
    is no dirty state and no Save button. */
export default function ToggleCard({
  eyebrow,
  description,
  checked,
  busy = false,
  unavailable,
  hint,
  error = null,
  onChange,
  children,
}: Props) {
  return (
    <section className='card stack' aria-label={eyebrow}>
      <div>
        <p className='eyebrow'>{eyebrow}</p>
        <p className='small muted' style={{ fontWeight: 600, marginTop: 6 }}>
          {description}
        </p>
      </div>

      {unavailable ? (
        <p className='small muted' style={{ fontWeight: 700 }}>
          {unavailable}
        </p>
      ) : (
        <>
          {/* A real checkbox, visually hidden and restyled, so keyboard
              operation and screen-reader semantics come for free. */}
          <label className='toggle-row'>
            <input
              type='checkbox'
              role='switch'
              className='toggle-input'
              checked={checked}
              disabled={busy}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className='toggle-track' aria-hidden='true'>
              <span className='toggle-thumb' />
            </span>
            <span className='toggle-label'>
              {busy ? 'Saving…' : checked ? 'On' : 'Off'}
            </span>
          </label>

          {hint && (
            <p className='small muted' style={{ fontWeight: 600 }}>
              {hint}
            </p>
          )}
          {error && (
            <p className='error-text' role='alert'>
              {error}
            </p>
          )}
          {children}
        </>
      )}
    </section>
  )
}
