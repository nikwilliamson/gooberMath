import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'

export default defineConfig({
  test: {
    projects: [
      {
        // Engine and voice logic: pure functions, node is enough.
        extends: './vite.config.ts',
        test: { name: 'engine', environment: 'node', include: ['src/**/*.test.ts'] },
      },
      {
        // Every story rendered in a real browser, plus its play function and
        // the a11y checks from preview.tsx.
        extends: './vite.config.ts',
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            // CHROMIUM_PATH points at a system Chromium where Playwright's
            // own download is not available; otherwise `npx playwright install chromium`.
            provider: playwright({
              launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
            }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
