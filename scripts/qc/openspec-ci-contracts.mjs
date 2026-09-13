/**
 * Declarative CI-quality contracts consumed by
 * `scripts/qc/validate-openspec-ci-quality.mjs`.
 *
 * Two kinds of workflow contract live here:
 *
 * - `requiredWorkflowTokens` — tokens that must appear ANYWHERE in the
 *   pull-request workflow. Cheap, but satisfied by a substring in any
 *   job or comment.
 * - `requiredWorkflowJobContracts` — executable fields required inside ONE
 *   named parsed YAML job. A gate that names the job it belongs to cannot be
 *   satisfied by the same command existing in a different lane (or in a
 *   comment), which is the failure mode the loose form allows.
 */

export const requiredProtectedContexts = [
  'Lint and Test',
  'Build Test / win',
  'Build Test / mac',
  'Build Test / linux',
];

export const requiredAggregatorNeeds = [
  'lint',
  'format-check',
  'typecheck',
  'unit-test-shards',
  'perf-smoke-tests',
  'statistical-proof-pr',
  'perf-budget-pr',
  'coverage-floor',
  'a11y-tests',
  'validate-bv',
  'validate-combat',
  'storybook-build',
  'schema-bridge',
  'determinism-audit',
  'e2e-smoke',
  'seam-anchors',
  'customizer-regressions',
  'desktop-typecheck',
  'desktop-tests',
];

export const requiredWorkflowTokens = [
  {
    id: 'openspec-targets-main-prs',
    tokens: ['pull_request:', 'branches:', '- main'],
  },
  {
    id: 'lint-runs-package-script',
    tokens: ['name: Lint', 'run: npm run lint'],
  },
  {
    id: 'format-check-runs-package-script',
    tokens: ['name: Format Check', 'run: npm run format:check'],
  },
  {
    id: 'typecheck-runs-typescript',
    tokens: ['name: Type Check', 'run: npx tsc --noEmit'],
  },
  {
    id: 'schema-bridge-is-strict',
    tokens: [
      'name: Schema Bridge',
      'npm run schema:gen-check',
      'run_schema_validation_only.py --shape all --strict',
      'npx jest src/types/contracts --ci --no-coverage',
    ],
  },
  {
    id: 'combat-and-bv-gates-run',
    tokens: [
      'name: Validate BV Parity',
      'run: npm run validate:bv',
      'name: Validate Combat Suite',
      'run: npm run validate:combat',
    ],
  },
  {
    id: 'browser-smoke-runs-playwright',
    tokens: [
      'name: E2E Smoke',
      'npx playwright test e2e/tactical-map-visual-smoke.spec.ts --project=chromium',
    ],
  },
  {
    id: 'desktop-build-required-platforms',
    tokens: [
      'name: Build Test / ${{ matrix.platform }}',
      'platform: linux',
      'platform: win',
      'platform: mac',
      'npx electron-builder --dir --publish never',
    ],
  },
];

/**
 * The customizer browser gate (add-customizer-pr-regression-gate).
 *
 * Every token is scoped to the `customizer-regressions` job block so the
 * contract pins the gate itself, not the workflow's vocabulary:
 *
 * - the exact three-spec Playwright invocation through the repo runner
 *   wrapper, so neither pack can be dropped from the lane;
 * - `--retries=0`, so a flaky regression is never retried to green;
 * - `--trace=retain-on-failure`, because the config's
 *   `trace: 'on-first-retry'` produces nothing at zero retries;
 * - the record-sheet asset prerequisite (`fetch-assets` in THIS job's
 *   checkout plus the strict validator), because assets fetched by
 *   `install-deps` are not present here and a missing template would
 *   otherwise degrade to the CDN fallback instead of failing.
 */
export const requiredWorkflowJobContracts = [
  {
    id: 'customizer-regressions-gate',
    jobId: 'customizer-regressions',
    jobName: 'Customizer Regressions',
    requiredNeeds: ['detect-changes', 'install-deps'],
    skipIf:
      "needs.detect-changes.outputs.code != 'true' && needs.detect-changes.outputs.e2e != 'true'",
    changeGateIf:
      "needs.detect-changes.outputs.code == 'true' || needs.detect-changes.outputs.e2e == 'true'",
    uploadFailureIf:
      "failure() && (needs.detect-changes.outputs.code == 'true' || needs.detect-changes.outputs.e2e == 'true')",
    setupAction: {
      uses: './.github/actions/setup-node-and-install',
      with: { 'fetch-assets': 'true' },
    },
    requiredRuns: [
      {
        id: 'strict-record-sheet-assets',
        run: 'npm run validate:assets:strict',
      },
      {
        id: 'production-build',
        run: 'npm run build',
        env: {
          NEXT_PUBLIC_E2E_MODE: 'true',
          NEXT_PUBLIC_E2E_TEST: 'true',
        },
      },
      {
        id: 'customizer-playwright',
        run: 'node scripts/playwright/run-playwright.mjs test e2e/customizer-equipment-catalog.spec.ts e2e/customizer-record-sheet-rendering.spec.ts e2e/customizer-edit-recovery.spec.ts --project=chromium --retries=0 --trace=retain-on-failure',
        env: {
          MEKSTATION_E2E_SERVER_COMMAND: 'node .next/standalone/server.js',
          HOSTNAME: '127.0.0.1',
        },
      },
    ],
  },
];

export const requiredPackageScripts = [
  {
    id: 'qc:openspec-ci:validate',
    tokens: ['validate-openspec-ci-quality.mjs'],
  },
  {
    id: 'verify:qc',
    tokens: ['qc:openspec-ci:validate', 'qc:validate', 'qc:lifecycle:status'],
  },
  {
    id: 'verify:rules',
    tokens: [
      'validate:combat:gaps',
      '--expect-total=0',
      '--expect-total=149',
      'openspec validate --all --strict',
    ],
  },
];
