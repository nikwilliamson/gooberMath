import type { StorybookConfig } from '@storybook/react-vite'
import { fileURLToPath, URL } from 'node:url'
import type { Plugin } from 'vite'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/**
 * Modules that touch the outside world get a Storybook-only stand-in. Keyed on
 * the resolved source path rather than the import specifier, so `./persist`
 * from inside the store and `@/store/persist` from App both land on the stub.
 */
const STUBS: Record<string, string> = {
  [here('../src/store/persist.ts')]: here('./mocks/persist.ts'),
  [here('../src/audio/engine.ts')]: here('./mocks/audio.ts'),
  [here('../src/voice/listener.ts')]: here('./mocks/voice-listener.ts'),
  [here('../src/voice/permission.ts')]: here('./mocks/voice-permission.ts'),
}

const stubs = (): Plugin => ({
  name: 'goobermath:storybook-stubs',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (importer && Object.values(STUBS).includes(importer)) return null
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
    const stub = resolved && STUBS[resolved.id]
    return stub ?? null
  },
})

export default {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  // Art and the run track are absolute /img and /audio URLs in the app.
  staticDirs: ['../public'],
  viteFinal: (config) => ({
    ...config,
    // The PWA plugin would register a service worker on :6006 and trip over
    // the precache glob; nothing in Storybook wants it.
    plugins: [
      stubs(),
      ...(config.plugins ?? [])
        .flat()
        .filter((p) => !(p && typeof p === 'object' && 'name' in p && String(p.name).startsWith('vite-plugin-pwa'))),
    ],
  }),
} satisfies StorybookConfig
