import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// goobermath.com serves from the root. Override with BASE_PATH='/<repo>/' to
// build for the bare github.io project URL instead.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  // Vite's default target assumes very recent Safari. An older iPad or phone
  // then fails to parse the bundle and renders a blank page.
  build: { target: ['es2020', 'safari14', 'chrome87', 'firefox78'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // A stale worker must never be able to pin a broken build on a device.
      workbox: {
        // The default glob misses audio, which would leave offline runs silent.
        // Precache the shell only. The art and the 60s track are several MB
        // together, and blocking first paint on them over cellular is worse
        // than fetching them once and keeping them.
        globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest}'],
        // Voice is opt-in. Precaching its worker would make every visitor
        // download it; the model itself lives in the worker's own IndexedDB.
        globIgnores: ['**/vosk*', 'voice/**'],
        runtimeCaching: [
          {
            // The typeface is external, so offline runs would fall back to the
            // system stack without this.
            urlPattern: /^https:\/\/(use|p)\.typekit\.net\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'goobermath-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The recognizer's worker and wasm, once voice has been used, so it
            // keeps working offline. The model is not here: the worker stores
            // it in IndexedDB itself, and a second 40MB copy would be waste.
            urlPattern: ({ url }: { url: URL }) => /\/assets\/vosk[^/]*$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'goobermath-voice',
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ request }: { request: Request }) =>
              request.destination === 'image' || request.destination === 'audio',
            handler: 'CacheFirst',
            options: {
              cacheName: 'goobermath-media',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'GooberMath',
        short_name: 'GooberMath',
        description: 'Math fact speed quests',
        theme_color: '#0b0a1f',
        background_color: '#0b0a1f',
        display: 'standalone',
        orientation: 'any',
        id: base,
        scope: base,
        start_url: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
