import type { ReactNode } from 'react'
import type { Preference } from '../../hooks/usePreference'
import { Skeleton, SkeletonText } from '../Skeleton'

export interface Option {
  value: string
  label: string
  /** Shown under the picker while this option is the selected one. */
  note?: string
}

/** At the real heights, so the card doesn't grow when the options arrive. */
function FieldSkeleton({ hasNote }: { hasNote: boolean }) {
  return (
    <>
      <div className='field'>
        <Skeleton variant='text' w={78} h={11} style={{ margin: 0 }} />
        <Skeleton h={55} style={{ borderRadius: 16 }} />
      </div>
      {hasNote && (
        <SkeletonText
          lines={1}
          widths={['82%']}
          className='small'
          style={{ margin: 0 }}
        />
      )}
      <Skeleton h={62} style={{ borderRadius: 22 }} />
    </>
  )
}

interface Props {
  eyebrow: string
  description: ReactNode
  label: string
  id: string
  /** Null until the choices are known; the card draws a placeholder. */
  options: Option[] | null
  /** Makes the placeholder leave room for a note before the pick is known. */
  hasNote?: boolean
  pref: Preference
  saveLabel: string
  /** A failure fetching the options — a failed save lives on `pref`. */
  loadError?: string | null
  onRetryLoad?: () => void
}

/** A picker and a save button, disabled until the pick differs from what's
    stored. */
export default function PreferenceCard({
  eyebrow,
  description,
  label,
  id,
  options,
  hasNote = false,
  pref,
  saveLabel,
  loadError = null,
  onRetryLoad,
}: Props) {
  const selected = options?.find((option) => option.value === pref.value)

  return (
    <section className='card stack' aria-label={eyebrow}>
      <div>
        <p className='eyebrow'>{eyebrow}</p>
        <p className='small muted' style={{ fontWeight: 600, marginTop: 6 }}>
          {description}
        </p>
      </div>

      {loadError && (
        <>
          <p className='error-text' role='alert'>
            {loadError}
          </p>
          {onRetryLoad && (
            <button className='btn-ghost' onClick={onRetryLoad}>
              Try again
            </button>
          )}
        </>
      )}

      {!options && !loadError && <FieldSkeleton hasNote={hasNote} />}

      {options && (
        <>
          <div className='field'>
            <label htmlFor={id}>{label}</label>
            <select
              id={id}
              value={pref.value}
              onChange={(e) => pref.choose(e.target.value)}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {/* Of what's selected, not what's saved: a licence should be visible
              before committing to it. */}
          {selected?.note && (
            <p className='small muted' style={{ fontWeight: 600 }}>
              {selected.note}
            </p>
          )}
          {pref.error && (
            <p className='error-text' role='alert'>
              {pref.error}
            </p>
          )}
          {pref.saved && (
            <p
              className='small'
              style={{ color: 'var(--green-text)', fontWeight: 800 }}
            >
              Saved.
            </p>
          )}
          <button
            className='btn'
            onClick={() => void pref.submit()}
            disabled={pref.saving || !pref.dirty}
          >
            {pref.saving ? 'Saving…' : saveLabel}
          </button>
        </>
      )}
    </section>
  )
}
