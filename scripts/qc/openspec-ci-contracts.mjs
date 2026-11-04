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
  'e2e-build',
  'e2e',
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
    tokens: ['name: Type Check', 'run: npm run typecheck'],
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
    // The generator tests include the resolution snapshot, additive-only and
    // category guards for the equipment catalog (#2580).
    id: 'equipment-catalog-generator-tests-run',
    tokens: [
      'name: Test equipment catalog generator and resolution guards',
      'node --test scripts/equipment-catalog/*.test.mjs',
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
      'name: Run tactical-map visual smoke',
      'node scripts/playwright/run-playwright.mjs test e2e/tactical-map-visual-smoke.spec.ts --project=chromium',
      'name: Run customizer library suite',
      'node scripts/playwright/run-playwright.mjs test e2e/customizer-library-open.spec.ts --project=chromium',
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
 * The per-PR browser gates (add-customizer-pr-regression-gate, and the seam
 * trust anchors of add-seam-trust-anchor-journeys).
 *
 * The gates run in two jobs, and every token is scoped to its own job block
 * so the contract pins the gate itself, not the workflow's vocabulary:
 *
 * - `e2e-build` fetches the record-sheet assets in THIS job's checkout,
 *   validates them strictly, and builds the E2E-mode production app once.
 *   A missing template fails here instead of degrading to the CDN fallback;
 *   the build copies the assets into the standalone public/ the shards serve.
 * - `e2e` runs the exact six-spec gate invocation through the repo runner
 *   wrapper against that standalone server, in every shard of a fixed
 *   three-shard matrix, so no pack and no shard can be dropped;
 *   `--retries=0`, so a flaky regression is never retried to green;
 *   `--trace=retain-on-failure`, because the config's
 *   `trace: 'on-first-retry'` produces nothing at zero retries.
 */
const E2E_CHANGE_GATE_IF =
  "needs.detect-changes.outputs.code == 'true' || needs.detect-changes.outputs.e2e == 'true'";

export const requiredWorkflowJobContracts = [
  {
    id: 'customizer-regressions-build',
    jobId: 'e2e-build',
    jobName: 'E2E Build',
    requiredNeeds: ['detect-changes'],
    timeoutMinutes: 15,
    skipIf:
      "needs.detect-changes.outputs.code != 'true' && needs.detect-changes.outputs.e2e != 'true'",
    changeGateIf: E2E_CHANGE_GATE_IF,
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
    ],
  },
  {
    id: 'customizer-regressions-gate',
    jobId: 'e2e',
    jobName: 'E2E (${{ matrix.shard }}/3)',
    requiredNeeds: ['detect-changes', 'e2e-build'],
    timeoutMinutes: 20,
    matrixShards: [1, 2, 3],
    skipIf:
      "needs.detect-changes.outputs.code != 'true' && needs.detect-changes.outputs.e2e != 'true'",
    changeGateIf: E2E_CHANGE_GATE_IF,
    uploadFailureIf: `failure() && (${E2E_CHANGE_GATE_IF})`,
    // The gate writes its own report folder (the smoke suites write the
    // default one after it), and the failure upload must carry it.
    uploadPaths: [
      'test-results',
      'playwright-report',
      'playwright-report-gates',
    ],
    extraStepIfs: {
      'Run customizer library suite': `\${{ !cancelled() && (${E2E_CHANGE_GATE_IF}) }}`,
      'Run tactical-map visual smoke': `\${{ !cancelled() && (${E2E_CHANGE_GATE_IF}) }}`,
      'Upload library-open screenshots': `always() && (${E2E_CHANGE_GATE_IF})`,
    },
    setupAction: {
      uses: './.github/actions/setup-node-and-install',
    },
    requiredRuns: [
      {
        id: 'browser-gates-playwright',
        run: 'node scripts/playwright/run-playwright.mjs test e2e/active-session-recovery.spec.ts e2e/seam-roster-materialization-handoff.spec.ts e2e/seam-fresh-construction-no-instant-defeat.spec.ts e2e/customizer-equipment-catalog.spec.ts e2e/customizer-record-sheet-rendering.spec.ts e2e/customizer-edit-recovery.spec.ts --project=chromium --retries=0 --trace=retain-on-failure --workers=1 --shard=${{ matrix.shard }}/3 --output=test-results/gates',
        env: {
          MEKSTATION_E2E_SERVER_COMMAND: 'node .next/standalone/server.js',
          HOSTNAME: '127.0.0.1',
          PLAYWRIGHT_HTML_OUTPUT_DIR: 'playwright-report-gates',
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
