import { defineConfig, devices } from '@playwright/test';

const e2ePort = 3600;
const e2eBaseURL = `http://localhost:${e2ePort}`;
const e2eRunId =
  process.env.PLAYWRIGHT_E2E_RUN_ID ?? `pw-${process.pid}-${Date.now()}`;
process.env.PLAYWRIGHT_E2E_RUN_ID = e2eRunId;
process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA ??= 'true';
process.env.BROWSERSLIST_IGNORE_OLD_DATA ??= 'true';
const e2eReadyURL = `${e2eBaseURL}/__playwright_e2e_ready__?runId=${encodeURIComponent(
  e2eRunId,
)}`;
const e2eRuntimeDir = `./.sisyphus/e2e-runtime/${e2eRunId}`;

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
    baseURL: e2eBaseURL,

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
      // flow-audits.spec.ts (add-flow-audit-routines) is env-var-selected,
      // single-flow-at-a-time evidence tooling, not a project-wide sweep —
      // excluded here so bare `npm run test:e2e` and nightly-validation.yml's
      // `npx playwright test --project=chromium` never silently run all 6
      // flows (proposal.md non-goal: no CI wiring/behavior changes). The
      // flow-audit runner (task 4) targets this file directly by path, which
      // still works: Playwright resolves the CLI file arg against the
      // invoking project's own testMatch/testIgnore, so the runner must pass
      // its own project (or config) once it exists rather than `--project=chromium`.
      testIgnore: ['**/flow-audits.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },

    /* Phone (375px) - iPhone SE dimensions for audit */
    {
      name: 'Mobile Chrome',
      testIgnore: [
        '**/ux-deep-play-audit.spec.ts',
        '**/ux-walkthrough-audit.spec.ts',
        '**/flow-audits.spec.ts',
      ],
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
      testIgnore: [
        '**/ux-deep-play-audit.spec.ts',
        '**/ux-walkthrough-audit.spec.ts',
        '**/flow-audits.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
    },

    /* Tablet landscape (1024px) - for audit capture suite */
    {
      name: 'Tablet Landscape',
      testIgnore: [
        '**/ux-deep-play-audit.spec.ts',
        '**/ux-walkthrough-audit.spec.ts',
        '**/flow-audits.spec.ts',
      ],
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

    /* Flow-audit routines (add-flow-audit-routines task 4) — the single
       project that does NOT testIgnore flow-audits.spec.ts. Scoped with its
       own testMatch (rather than relying on the other projects' testIgnore
       lists) so it can never accidentally pick up any other spec file. The
       base viewport here is irrelevant: each generated test opens its own
       `browser.newContext({ viewport })` sized from MEKSTATION_FLOW_VIEWPORT
       (see e2e/flow-audits.spec.ts RESOLVED_VIEWPORT). Never referenced by
       any CI workflow — both nightly-validation.yml and pr-checks.yml pass
       `--project=chromium` explicitly, and scripts/qc/run-flow-audit.mjs is
       the only caller that targets this project by name.
       Registered ONLY when MEKSTATION_FLOW_ID is set (the flow-audit runner
       always sets it before spawning Playwright). Playwright runs every
       REGISTERED project when no `--project` flag is passed, so the other
       projects' `testIgnore` entries above are not sufficient on their own —
       a project that exists at all joins the default set. Gating on the same
       env var the spec file itself reads (design D2) keeps a bare
       `npm run test:e2e` / `npx playwright test` from ever picking this
       project up, matching the header comment on flow-audits.spec.ts. */
    ...(process.env.MEKSTATION_FLOW_ID
      ? [
          {
            name: 'flow-audit',
            testMatch: ['**/flow-audits.spec.ts'],
            use: { ...devices['Desktop Chrome'] },
          },
        ]
      : []),
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // Prod-evidence capture (command-screens re-audit H2): the capture
    // runner may override the server command with a build+start chain so
    // evidence can be taken against a production build. Default stays the
    // dev server; the timeout override exists because a full `next build`
    // inside the chain far exceeds the dev-server startup budget.
    command: process.env.MEKSTATION_E2E_SERVER_COMMAND ?? 'npm run dev',
    url: e2eReadyURL,
    // The readiness URL includes a per-run token. A stale server on 3600 will
    // not satisfy it, so Playwright runs the dev script and lets it clear 3600.
    reuseExistingServer: true,
    timeout: Number(process.env.MEKSTATION_E2E_SERVER_TIMEOUT_MS ?? 120 * 1000),
    // Pipe stdout to help with process cleanup on Windows
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NEXT_PUBLIC_E2E_MODE: 'true',
      PLAYWRIGHT_E2E_RUN_ID: e2eRunId,
      BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: 'true',
      BROWSERSLIST_IGNORE_OLD_DATA: 'true',
      // The custom WebSocket runtime is loaded through the dev server while
      // Pages API routes are loaded by Next. A per-run durable store gives
      // E2E the production storage boundary and avoids split in-memory match
      // state between those module graphs.
      MULTIPLAYER_STORE: 'durable',
      MULTIPLAYER_DB_PATH: `${e2eRuntimeDir}/multiplayer-matches.db`,
      DATABASE_PATH: `${e2eRuntimeDir}/mekstation.db`,
    },
  },
});
