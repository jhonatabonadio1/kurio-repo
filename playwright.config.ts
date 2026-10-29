import { defineConfig, devices } from '@playwright/test'

/**
 * E2E + visual regression. Every test runs against the production build
 * (`pnpm build && pnpm preview`) with MSW on, so REST goes through the MSW
 * handlers and real time through socket.io-client + the mock Socket.IO server.
 *
 * - E2E_BASE_URL: test an already running server instead (e.g. `pnpm dev`).
 * - PW_CHROMIUM_PATH: use a local Chromium build instead of the bundled one.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4173'
const executablePath = process.env.PW_CHROMIUM_PATH || undefined

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  // One baseline per project, no OS suffix: update them on Linux (see README).
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm build && pnpm preview',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { VITE_API_MOCKING: 'enabled' },
      },
})
