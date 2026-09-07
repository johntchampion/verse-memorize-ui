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

export async function enablePush(): Promise<void> {
  // Must run before any await: Safari only honours requestPermission while the
  // user gesture is still on the stack.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PermissionRefused(permission)

  await subscribeThisBrowser()
  await api.updateProfile({ remindersEnabled: true })
}

/**
 * Reuses an existing subscription only when it was made with the server's
 * current key — one made against a different key produces pushes this server
 * cannot sign, and reusing it blindly is an unexplainable silent failure.
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
    // Chrome rejects a subscription that reserves the right to push silently.
    userVisibleOnly: true,
    applicationServerKey: key as BufferSource,
  })

  await api.pushSubscribe(subscription.toJSON() as PushSubscriptionJSON)
}

export async function disablePush(): Promise<void> {
  // Server first: if the browser-side unsubscribe then fails, the half that
  // matters has already landed.
  await api.updateProfile({ remindersEnabled: false })

  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  await api.pushUnsubscribe(subscription.endpoint).catch(() => {})
  await subscription.unsubscribe()
}

export async function hasLocalSubscription(): Promise<boolean> {
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  return subscription != null
}
