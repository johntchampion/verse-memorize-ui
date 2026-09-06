import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
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
  /** No PushManager at all — an older browser, or desktop Safari before 16. */
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

/** Why the switch can't be shown, or null when it can. */
function platformBlocker(): Exclude<PushState, 'off' | 'on' | 'blocked'> | null {
  if (!pushSupported()) {
    // On iOS the APIs are absent in a tab and present once installed, so the
    // capability check alone can't tell "never" from "not yet".
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  return null
}

/**
 * The daily-reminder switch.
 *
 * Two states of the world have to agree: a server-side preference that applies
 * to the account, and a PushSubscription that belongs to this one browser. They
 * drift in both directions, and the two effects below are what reconcile them.
 */
export function usePushReminders(
  remindersEnabled: boolean | undefined,
  onSaved: () => void,
): PushReminders {
  /** Whichever state overrides the plain on/off switch, or null for none.
      Computed once on mount — a browser does not gain PushManager mid-session —
      but also set by `toggle` when the attempt itself reveals a blocker. */
  const [blocker, setBlocker] = useState<
    Exclude<PushState, 'off' | 'on'> | null
  >(platformBlocker)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The flipped-but-not-yet-confirmed value, cleared once the save lands and
  // the refetched profile becomes the truth — the same shape as usePreference.
  const [pending, setPending] = useState<boolean | null>(null)

  const enabled = pending ?? remindersEnabled ?? false

  // The "enabled it on my phone, now I'm on my laptop" case. The preference is
  // per account but a subscription is per browser, so without this the laptop
  // never receives anything and the switch quietly lies about it.
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
        // Nothing worth interrupting the user for: the account preference is
        // already right, and this browser retries on the next visit.
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
          setPending(null)
          onSaved()
        } catch (err) {
          if (err instanceof PermissionRefused) {
            // Not an error to shout about — they were asked and said no.
            setBlocker(err.permission === 'denied' ? 'blocked' : null)
            setError(err.message)
          } else if (err instanceof ApiError && err.status === 503) {
            setBlocker('unavailable')
          } else {
            setError(
              err instanceof Error
                ? err.message
                : 'Could not change your reminder setting.',
            )
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
      setError(
        err instanceof Error ? err.message : 'Could not send a test notification.',
      )
    }
  }, [])

  const state: PushState = blocker ?? (enabled ? 'on' : 'off')

  const unavailableMessage =
    state === 'unsupported'
      ? 'This browser can’t show notifications.'
      : state === 'needs-install'
        ? 'Add Verses to your Home Screen first, then turn reminders on here.'
        : state === 'unavailable'
          ? 'Reminders aren’t set up on this server yet.'
          : null

  return {
    state,
    enabled: state === 'on' || (state === 'blocked' && enabled),
    busy,
    error,
    unavailableMessage,
    // Blocked but still switched on: the preference is real and their other
    // devices are still being reminded, so don't flip it for them — just say
    // why this one is silent.
    hint:
      state === 'blocked'
        ? 'Notifications are blocked in your browser settings, so this device stays silent.'
        : null,
    toggle,
    sendTest,
  }
}
