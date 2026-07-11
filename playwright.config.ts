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
 * - @smoke: Critical path tests (grep-selected, no dedicated project anymore)
 * - @mobile-touch: hasTouch/isMobile-dependent tests (dedicated `mobile-touch`
 *   project below -- opt-in via tag, never suite-wide; design D2/D3)
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
 *   npx playwright test --grep @smoke --project=chromium  # Smoke tests only
 *   npx playwright test --grep-invert @slow                # Skip slow tests
 *   npx playwright test --grep @campaign                   # Campaign tests only
 *   npx playwright test --project=mobile-touch             # Tagged touch tests only
 *
 * Viewport coverage below desktop is a parameter dimension, not suite
 * duplication: `e2e/layout-sweep/viewport-layout-sweep.spec.ts` loops
 * `SWEEP_VIEWPORTS` under `chromium` via `setViewportSize`, and the handful
 * of specs that need `hasTouch`/`isMobile` self-scope with `test.use({...})`
 * (add-viewport-layout-sweep design D2 -- the responsive `Mobile Chrome` /
 * `Tablet Portrait` / `Tablet Landscape` / `smoke` projects that used to
 * 4x-schedule the whole suite are deleted; task 4.1's pre-deletion baseline
 * proved nothing responsive-only was silently load-bearing).
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
      // single-flow-at-a-time evidence tooling, not a project-wide sweep. The
      // primary guard is that the `flow-audit` project below is registered
      // ONLY when MEKSTATION_FLOW_ID is set (see its comment); this
      // testIgnore is defense in depth so this project can never match the
      // file even if that gating changes. scripts/qc/run-flow-audit.mjs is
      // the runner — it targets the `flow-audit` project by name, not
      // `--project=chromium` (proposal.md non-goal: no CI wiring/behavior
      // changes to the other projects).
      //
      // scenario-pack-minting.spec.ts (add-scenario-packs, task 3.2) is the
      // same shape — env-var-selected generator tooling, not a project-wide
      // sweep. Excluded here as defense in depth on top of the dedicated
      // `scenario-pack-mint` project below (registered ONLY when
      // MEKSTATION_MINT_PACK_ID is set) and the file's own internal
      // `test.skip` gate. Note this project deliberately does NOT ignore
      // `e2e/scenario-packs/**` — the pilot packs' parity specs run under
      // `chromium` (design R8: excluded from VIEWPORT multiplication only,
      // never from chromium itself; task 3.4/7.3's `--list` proof).
      testIgnore: [
        '**/flow-audits.spec.ts',
        '**/scenario-pack-minting.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },

    /* Tag-scoped touch/mobile-emulation project (add-viewport-layout-sweep
       design D2/D3) — replaces the four deleted responsive/smoke projects
       (`Mobile Chrome`, `Tablet Portrait`, `Tablet Landscape`, `smoke`),
       which used to 4x-schedule the entire suite by file duplication.
       Selection is the tag, not the project: only tests whose titles carry
       `@mobile-touch` are scheduled here (the same grep-selection mechanism
       `smoke` used for years, just narrower by construction). Existing
       touch-interaction describes opt in explicitly (`mobile-navigation.spec.ts`
       "Touch Interactions", `tactical-map-visual-smoke.spec.ts`'s isometric
       touch describe); their own `test.use({...})` blocks are untouched, so
       the tag is pure selection, not behavior. Anchors, deep-play/walkthrough,
       sweep, and pack parity specs must NEVER carry this tag (spec'd) — a
       tag-scoped project must not re-introduce double-scheduling of
       chromium-contract specs. Viewport width below desktop is now a
       parameter dimension (the layout sweep's `setViewportSize` loop; the
       handful of self-scoping specs' own `test.use`), never suite
       duplication — task 4.1's pre-deletion baseline (all three deleted
       responsive projects run once, full) confirmed nothing responsive-only
       was silently load-bearing on the deleted trio. */
    {
      name: 'mobile-touch',
      grep: /@mobile-touch/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
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

    /* Scenario pack minter (add-scenario-packs, task 3.2) — the exact same
       env-var-gated-project pattern as `flow-audit` above: registered ONLY
       when MEKSTATION_MINT_PACK_ID is set (scripts/qc/mint-scenario-pack.mjs
       always sets it before spawning Playwright), scoped by its own
       testMatch so it can never accidentally pick up any other spec file.
       Never referenced by any CI workflow — nightly-validation.yml and
       pr-checks.yml pass `--project=chromium` explicitly, and
       mint-scenario-pack.mjs is the only caller that targets this project by
       name (design D7 layer 1: "every payload is written by a registered
       minter"; never a CI-invoked step). */
    ...(process.env.MEKSTATION_MINT_PACK_ID
      ? [
          {
            name: 'scenario-pack-mint',
            testMatch: ['**/scenario-pack-minting.spec.ts'],
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
