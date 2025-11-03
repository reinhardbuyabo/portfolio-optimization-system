import { defineConfig, devices } from '@playwright/test';

const authFile = 'playwright-auth.json';

export default defineConfig({
  globalSetup: require.resolve('./playwright.setup'),
  testDir: './__tests__',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    storageState: authFile,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});