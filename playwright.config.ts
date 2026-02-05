import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for MekStation E2E tests
 *
 * Test categorization via tags:
 * - @smoke: Critical path tests (run on every PR)
 * - @slow: Tests that take > 30s (skip for quick feedback)
 * - @campaign: Campaign system tests
 * - @encounter: Encounter system tests
 * - @force: Force management tests
 * - @game: Game session tests
 * - @combat: Combat resolution tests
 * - @customizer: Customizer tests
 * - @compendium: Compendium tests
 *
 * Usage:
 *   npx playwright test --grep @smoke        # Run smoke tests only
 *   npx playwright test --grep-invert @slow  # Skip slow tests
 *   npx playwright test --grep @campaign     # Run campaign tests only
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Parallel workers - more on local, single on CI for stability */
  workers: process.env.CI ? 1 : undefined,

  /* Test timeout - 30s default, can be overridden per test */
  timeout: 30 * 1000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 10 * 1000,
  },

  /* Reporter configuration */
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  /* Screenshot directory for audit capture suite */
  snapshotDir: '.sisyphus/evidence/screenshots',

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'on-first-retry',

    /* Viewport size */
    viewport: { width: 1280, height: 720 },

    /* Action timeout */
    actionTimeout: 10 * 1000,

    /* Navigation timeout */
    navigationTimeout: 30 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    /* Desktop (1280px) - primary */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    /* Phone (375px) - iPhone SE dimensions for audit */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
    },

    /* Tablet portrait (768px) - iPad Mini dimensions for audit */
    {
      name: 'Tablet Portrait',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
    },

    /* Tablet landscape (1024px) - for audit capture suite */
    {
      name: 'Tablet Landscape',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
      },
    },

    /* Smoke tests - fast subset for PR checks */
    {
      name: 'smoke',
      grep: /@smoke/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev:e2e',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Pipe stdout to help with process cleanup on Windows
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NEXT_PUBLIC_E2E_MODE: 'true',
    },
  },
});
