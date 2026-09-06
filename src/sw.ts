/// <reference lib="webworker" />

/**
 * The app's service worker.
 *
 * This file exists because the app sends push notifications, and a push
 * handler has to live in a worker we write. Moving off vite-plugin-pwa's
 * generated worker (`generateSW`) to `injectManifest` means three things the
 * plugin used to do silently are now this file's responsibility, and all three
 * fail quietly if they go missing:
 *
 *   1. skipWaiting/clientsClaim. `registerType: 'autoUpdate'` sets these, but
 *      only on the options generateSW reads -- under injectManifest they are
 *      ours. Without them every install is stranded on the worker it first saw,
 *      and it only shows up on the *second* deploy.
 *   2. The navigation fallback. Without it a cold launch straight to /settings
 *      404s instead of getting the SPA shell.
 *   3. cleanupOutdatedCaches, or old precaches accumulate forever.
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

// createHandlerBoundToURL throws unless index.html is actually in the precache,
// and under `vite dev` the injected manifest is empty -- where the dev server
// serves navigations itself, so there is nothing to fall back to anyway.
if (manifest.length > 0) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
      // The API is served from this same origin. Its paths are never
      // navigations today, but denying them explicitly keeps that true if one
      // ever becomes one.
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
 * A push must always end in a visible notification.
 *
 * Chrome shows its own "This site has been updated in the background" if one
 * doesn't appear, and a site that makes a habit of that can have its
 * permission revoked — so even an unreadable payload falls through to the
 * default copy rather than returning quietly.
 */
self.addEventListener('push', (event) => {
  let data: ReminderPayload = {}
  try {
    data = event.data ? (event.data.json() as ReminderPayload) : {}
  } catch {
    // Not JSON — a push service keepalive, or a bad send. Use the defaults.
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Time to practise', {
      body: data.body ?? 'Your verses are waiting.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // Collapses repeats on the device rather than stacking them.
      tag: data.tag ?? 'daily-reminder',
      data: { url: data.url ?? '/' },
    }),
  )
})

/**
 * Focus an already-open window rather than opening a second one — a duplicate
 * tab of the same app is worse than no navigation at all.
 */
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
