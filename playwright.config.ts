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
    /* Desktop tests - primary */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    /* Mobile tests */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
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
