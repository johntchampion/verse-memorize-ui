import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import { messageOf } from '../lib/errors'
import {
  disablePush,
  enablePush,
  hasLocalSubscription,
  isIos,
  isStandalone,
  PermissionRefused,
  pushSupported,
  subscribeThisBrowser,
} from '../lib/push'

export type PushState =
  | 'unsupported'
  /** iOS in a browser tab: Web Push only exists once it is on the Home Screen. */
  | 'needs-install'
  /** The deployment has no VAPID keys. */
  | 'unavailable'
  /** Permission was denied in the browser's own settings. */
  | 'blocked'
  | 'off'
  | 'on'

export interface PushReminders {
  state: PushState
  /** True while the switch should read as on, including when blocked. */
  enabled: boolean
  busy: boolean
  error: string | null
  /** Set when the switch cannot be operated at all on this platform. */
  unavailableMessage: string | null
  /** Set when it can, but something needs saying. */
  hint: string | null
  toggle: (next: boolean) => void
  sendTest: () => Promise<void>
}

const UNAVAILABLE_COPY: Partial<Record<PushState, string>> = {
  unsupported: 'This browser can’t show notifications.',
  'needs-install':
    'Add Verses to your Home Screen first, then turn reminders on here.',
  unavailable: 'Reminders aren’t set up on this server yet.',
}

const BLOCKED_HINT =
  'Notifications are blocked in your browser settings, so this device stays silent.'

/** On iOS the APIs are absent in a tab and present once installed, so the
    capability check alone can't tell "never" from "not yet". */
function platformBlocker(): Exclude<
  PushState,
  'off' | 'on' | 'blocked'
> | null {
  if (!pushSupported()) {
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  return null
}

/**
 * The daily-reminder switch. Two states of the world have to agree: an account
 * preference on the server, and a PushSubscription belonging to this browser.
 */
export function usePushReminders(
  remindersEnabled: boolean | undefined,
  onSaved: () => void,
): PushReminders {
  const [blocker, setBlocker] = useState<Exclude<
    PushState,
    'off' | 'on'
  > | null>(platformBlocker)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<boolean | null>(null)

  const enabled = pending ?? remindersEnabled ?? false

  useEffect(() => {
    if (pending !== null && remindersEnabled === pending) setPending(null)
  }, [pending, remindersEnabled])

  // The "enabled it on my phone, now I'm on my laptop" case: the preference is
  // per account but a subscription is per browser.
  useEffect(() => {
    if (remindersEnabled !== true) return
    if (platformBlocker() !== null) return
    if (Notification.permission !== 'granted') return

    let cancelled = false
    void (async () => {
      try {
        if (await hasLocalSubscription()) return
        if (!cancelled) await subscribeThisBrowser()
      } catch {
        // The account preference is already right; this browser retries on the
        // next visit.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [remindersEnabled])

  const toggle = useCallback(
    (next: boolean) => {
      setBusy(true)
      setError(null)
      setPending(next)
      void (async () => {
        try {
          if (next) {
            await enablePush()
          } else {
            await disablePush()
          }
          onSaved()
        } catch (err) {
          if (err instanceof PermissionRefused) {
            setBlocker(err.permission === 'denied' ? 'blocked' : null)
            setError(err.message)
          } else if (err instanceof ApiError && err.status === 503) {
            setBlocker('unavailable')
          } else {
            setError(messageOf(err, 'Could not change your reminder setting.'))
          }
          // Nothing was saved, so the switch goes back where it was.
          setPending(null)
        } finally {
          setBusy(false)
        }
      })()
    },
    [onSaved],
  )

  const sendTest = useCallback(async () => {
    setError(null)
    try {
      const result = await api.pushTest()
      if (result.sent === 0) {
        setError('No device received it. Try turning reminders off and on.')
      }
    } catch (err) {
      setError(messageOf(err, 'Could not send a test notification.'))
    }
  }, [])

  const state: PushState = blocker ?? (enabled ? 'on' : 'off')

  return {
    state,
    enabled: state === 'on' || (state === 'blocked' && enabled),
    busy,
    error,
    unavailableMessage: UNAVAILABLE_COPY[state] ?? null,
    // Blocked but still switched on: the preference is real and their other
    // devices are still being reminded, so say why this one is silent rather
    // than flipping it for them.
    hint: state === 'blocked' ? BLOCKED_HINT : null,
    toggle,
    sendTest,
  }
}
