import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import { messageOf } from '../lib/errors'
import {
  disablePush,
  enablePush,
  enableThisDevice,
  isIos,
  isStandalone,
  notificationPermission,
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
  /** The account preference is on, but this browser can't receive a push:
      permission was never asked for, or its subscription has gone missing. */
  | 'needs-device'
  | 'off'
  | 'on'

export interface PushReminders {
  state: PushState
  /** True while the switch should read as on, including when this device is silent. */
  enabled: boolean
  busy: boolean
  error: string | null
  /** Set when the switch cannot be operated at all on this platform. */
  unavailableMessage: string | null
  /** Set when it can, but something needs saying. */
  hint: string | null
  toggle: (next: boolean) => void
  /** Permission + subscription for this browser, leaving the preference alone.
      Must be called straight from a click: Safari's prompt needs the gesture. */
  enableThisDevice: () => Promise<void>
  sendTest: () => Promise<void>
}

const UNAVAILABLE_COPY: Partial<Record<PushState, string>> = {
  unsupported: 'This browser can’t show notifications.',
  'needs-install':
    'Add Verses to your Home Screen first, then turn reminders on here.',
  unavailable: 'Reminders aren’t set up on this server yet.',
}

const HINTS: Partial<Record<PushState, string>> = {
  blocked:
    'Notifications are blocked in your browser settings, so this device stays silent.',
  'needs-device':
    'This device isn’t set up to receive them yet. Your other devices are unaffected.',
}

/** Anything that stops the switch from meaning what it says, worked out fresh
    each time it's asked: on iOS the APIs are absent in a tab and present once
    installed, and permission can be changed in browser settings behind our
    back, so neither answer survives being cached across a visit. */
function currentBlocker(): Exclude<
  PushState,
  'off' | 'on' | 'needs-device'
> | null {
  if (!pushSupported()) {
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  return notificationPermission() === 'denied' ? 'blocked' : null
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
    'off' | 'on' | 'needs-device'
  > | null>(currentBlocker)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<boolean | null>(null)
  /** null until the reconcile below has had its say, so the card doesn't flash
      the button at someone whose device is fine. */
  const [deviceReady, setDeviceReady] = useState<boolean | null>(null)

  const enabled = pending ?? remindersEnabled ?? false

  useEffect(() => {
    if (pending !== null && remindersEnabled === pending) setPending(null)
  }, [pending, remindersEnabled])

  /** Bumped on returning to the tab, to re-run the reconcile below. */
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    function recheck() {
      if (document.visibilityState !== 'visible') return
      setBlocker(currentBlocker())
      setRevision((n) => n + 1)
    }
    document.addEventListener('visibilitychange', recheck)
    return () => document.removeEventListener('visibilitychange', recheck)
  }, [])

  useEffect(() => {
    if (remindersEnabled !== true) return
    if (blocker !== null) return

    let cancelled = false
    void (async () => {
      let ready = false
      try {
        if (notificationPermission() === 'granted') {
          await subscribeThisBrowser()
          ready = true
        }
      } catch {
        // Offer the button instead; this browser retries on the next visit.
      }
      if (!cancelled) setDeviceReady(ready)
    })()

    return () => {
      cancelled = true
    }
  }, [remindersEnabled, blocker, revision])

  const report = useCallback((err: unknown, fallback: string) => {
    if (err instanceof PermissionRefused) {
      setBlocker(err.permission === 'denied' ? 'blocked' : null)
      setError(err.message)
    } else if (err instanceof ApiError && err.status === 503) {
      setBlocker('unavailable')
    } else {
      setError(messageOf(err, fallback))
    }
  }, [])

  const toggle = useCallback(
    (next: boolean) => {
      setBusy(true)
      setError(null)
      setPending(next)
      void (async () => {
        try {
          if (next) {
            await enablePush()
            setDeviceReady(true)
          } else {
            await disablePush()
            setDeviceReady(null)
          }
          onSaved()
        } catch (err) {
          report(err, 'Could not change your reminder setting.')
          // Nothing was saved, so the switch goes back where it was.
          setPending(null)
        } finally {
          setBusy(false)
        }
      })()
    },
    [onSaved, report],
  )

  const enableDevice = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await enableThisDevice()
      setDeviceReady(true)
    } catch (err) {
      report(err, 'Could not turn on notifications for this device.')
      setDeviceReady(false)
    } finally {
      setBusy(false)
    }
  }, [report])

  const sendTest = useCallback(async () => {
    setError(null)
    try {
      const result = await api.pushTest()
      // Nothing reached any of their devices, so the server has no working
      // subscription for this one either. The button that appears is the fix.
      if (result.sent === 0) setDeviceReady(false)
    } catch (err) {
      setError(messageOf(err, 'Could not send a test notification.'))
    }
  }, [])

  const state: PushState =
    blocker ??
    (!enabled ? 'off' : deviceReady === false ? 'needs-device' : 'on')

  return {
    state,
    enabled:
      state === 'on' ||
      ((state === 'blocked' || state === 'needs-device') && enabled),
    busy,
    error,
    unavailableMessage: UNAVAILABLE_COPY[state] ?? null,
    hint: HINTS[state] ?? null,
    toggle,
    enableThisDevice: enableDevice,
    sendTest,
  }
}
