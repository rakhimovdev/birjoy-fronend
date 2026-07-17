import { defineConfig, devices } from '@playwright/test';

const isLocalRun = process.env.PLAYWRIGHT_USE_LOCAL === '1';
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  (isLocalRun ? 'http://127.0.0.1:9002' : 'https://www.bir-joy.uz');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: false,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
      },
    },
  ],
  webServer: isLocalRun
    ? [
        {
          command: 'npm start',
          cwd: '../backend',
          url: 'http://127.0.0.1:5000/api/health',
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: 'npm run dev',
          cwd: '.',
          url: 'http://127.0.0.1:9002/uy-joy',
          reuseExistingServer: true,
          timeout: 180_000,
        },
      ]
    : undefined,
});
