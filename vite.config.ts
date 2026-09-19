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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,m4a}'],
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
