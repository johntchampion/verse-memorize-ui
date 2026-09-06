/**
 * The browser half of the daily reminder.
 *
 * Everything here needs a secure context, and on iOS it needs a PWA installed
 * to the Home Screen — in a Safari tab `PushManager` is simply absent, which is
 * why the capability check below is enough on its own and no user-agent
 * sniffing is involved in deciding whether push *works*. `isIos` exists only to
 * word the explanation.
 */
import { api } from '../api/client'

export function pushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** True when the app is running as an installed PWA rather than in a tab. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

/** iPadOS reports itself as a Mac, hence the touch-point check. */
export function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/** The VAPID key arrives as base64url text; applicationServerKey wants bytes. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const standard = padded.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(standard)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export class PermissionRefused extends Error {
  readonly permission: NotificationPermission

  constructor(permission: NotificationPermission) {
    super(
      permission === 'denied'
        ? 'Notifications are blocked in your browser settings.'
        : 'Notifications need your permission.',
    )
    this.permission = permission
  }
}

function sameKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const existing = subscription.options.applicationServerKey
  if (!existing) return false
  const bytes = new Uint8Array(existing)
  return (
    bytes.length === key.length && bytes.every((byte, i) => byte === key[i])
  )
}

/**
 * Subscribes this browser and records the preference on the server.
 *
 * Must be called straight from a user gesture. `requestPermission` comes first
 * and before any `await` on purpose: Safari only honours it while the gesture
 * is still on the stack, and fetching the VAPID key first — which is the
 * natural way to write this — loses it.
 */
export async function enablePush(): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PermissionRefused(permission)

  await subscribeThisBrowser()
  await api.updateProfile({ remindersEnabled: true })
}

/**
 * Registers this browser against the server's current key, reusing an existing
 * subscription only when it was made with that same key.
 *
 * The comparison is what makes a server key change recoverable: a subscription
 * made against a different key produces pushes this server cannot sign, and
 * reusing it blindly is the "it worked yesterday" failure with nothing in the
 * UI to explain it.
 */
export async function subscribeThisBrowser(): Promise<void> {
  const { publicKey } = await api.pushKey()
  const key = urlBase64ToUint8Array(publicKey)
  const registration = await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (subscription && !sameKey(subscription, key)) {
    await subscription.unsubscribe()
    subscription = null
  }
  subscription ??= await registration.pushManager.subscribe({
    // Required: Chrome rejects a subscription that reserves the right to push
    // silently.
    userVisibleOnly: true,
    applicationServerKey: key as BufferSource,
  })

  await api.pushSubscribe(subscription.toJSON() as PushSubscriptionJSON)
}

/**
 * Stops the reminders.
 *
 * Server first: if the browser-side unsubscribe then fails, the half that
 * matters — "stop sending me these" — has already landed.
 */
export async function disablePush(): Promise<void> {
  await api.updateProfile({ remindersEnabled: false })

  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  // Best effort: the row is harmless once the preference is off, and the
  // scheduler gates on the preference.
  await api.pushUnsubscribe(subscription.endpoint).catch(() => {})
  await subscription.unsubscribe()
}

/** Whether this browser currently holds a subscription. */
export async function hasLocalSubscription(): Promise<boolean> {
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  return subscription != null
}
