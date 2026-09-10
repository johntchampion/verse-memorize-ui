/// <reference lib="webworker" />

/**
 * Under `injectManifest` (needed because the push handler must live in a worker
 * we write), three things generateSW did silently are ours, and each fails
 * quietly if dropped: skipWaiting/clientsClaim, the navigation fallback, and
 * cleanupOutdatedCaches.
 */

import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

const manifest = self.__WB_MANIFEST

precacheAndRoute(manifest)
cleanupOutdatedCaches()

// createHandlerBoundToURL throws unless index.html is in the precache, and
// under `vite dev` the manifest is empty -- the dev server serves navigations.
if (manifest.length > 0) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
      // The API shares this origin; deny its paths explicitly in case one ever
      // becomes a navigation.
      denylist: [/^\/api\//, /^\/auth\//],
    }),
  )
}

interface ReminderPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
}

/**
 * A push must always end in a visible notification — Chrome shows its own
 * "updated in the background" otherwise, and can revoke permission over it. So
 * even an unreadable payload falls through to the default copy.
 */
self.addEventListener('push', (event) => {
  let data: ReminderPayload = {}
  try {
    data = event.data ? (event.data.json() as ReminderPayload) : {}
  } catch {
    // Not JSON — a push service keepalive, or a bad send. Use the defaults.
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Time to practice', {
      body: data.body ?? 'Your verses are waiting.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // Collapses repeats on the device rather than stacking them.
      tag: data.tag ?? 'daily-reminder',
      data: { url: data.url ?? '/' },
    }),
  )
})

/** Focus an already-open window rather than opening a duplicate. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data as { url?: string } | undefined
  const url = data?.url ?? '/'

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue
        await client.focus()
        if ('navigate' in client) await client.navigate(url)
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})
