import { useCallback, useState } from 'react'

/**
 * One saved account preference: a local pick that only becomes the real value
 * once the server accepts it. Held apart from the profile fetch so choosing an
 * option doesn't wait on a round trip, and a failed save doesn't lose the pick.
 */
export interface Preference {
  /** The pending pick if there is one, else what the server has. */
  value: string
  choose: (next: string) => void
  submit: () => Promise<void>
  saving: boolean
  error: string | null
  saved: boolean
  /** Whether `value` differs from what's saved — i.e. there is work to do. */
  dirty: boolean
}

export function usePreference(
  current: string,
  save: (value: string) => Promise<unknown>,
  onSaved: () => void,
  failureMessage: string,
): Preference {
  const [pending, setPending] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const value = pending ?? current

  const choose = useCallback((next: string) => {
    setPending(next)
    setSaved(false)
  }, [])

  const submit = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await save(value)
      setSaved(true)
      setPending(null)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : failureMessage)
    } finally {
      setSaving(false)
    }
  }, [save, value, onSaved, failureMessage])

  return {
    value,
    choose,
    submit,
    saving,
    error,
    saved,
    dirty: value !== current,
  }
}
