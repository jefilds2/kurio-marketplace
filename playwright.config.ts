import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.KURIO_TEST_URL || 'http://127.0.0.1:4173'
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', reducedMotion: 'reduce', channel: 'chromium' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 } },
  ],
  webServer: process.env.KURIO_TEST_URL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL, reuseExistingServer: !process.env.CI, timeout: 60_000,
  },
})
