import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      // injectManifest rather than the default generateSW: a generated worker
      // has no way to carry a `push` handler, and bolting one on with
      // workbox.importScripts would park it in an untyped, unbundled file in
      // public/ with its own versioning problem. The cost is that src/sw.ts now
      // owns three things generateSW did silently -- skipWaiting/clientsClaim,
      // the navigation fallback, and cleanupOutdatedCaches. See the README.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Verse Memorize',
        short_name: 'Verses',
        description: 'Daily scripture memorization — three verses at a time.',
        theme_color: '#fff6ea',
        background_color: '#fff6ea',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // Padded so the artwork survives Android's maskable safe-zone crop.
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        // Spelled out because injectManifest has no default of its own: the
        // icons and the webmanifest have to be precached too, or an offline
        // launch renders the shell without them.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
      // Push only works in a secure context, and localhost is the one we get
      // for free -- so the worker has to register under `vite dev` or there is
      // no way to test any of this without deploying. The injected manifest is
      // empty in dev, so nothing is precached and pages stay live.
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  server: {
    // The API has no CORS middleware; in dev the app talks to it same-origin
    // through this proxy, matching how it will be served in production.
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
})
