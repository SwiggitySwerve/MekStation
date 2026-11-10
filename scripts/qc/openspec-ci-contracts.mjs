/**
 * Declarative CI-quality contracts consumed by
 * `scripts/qc/validate-openspec-ci-quality.mjs`.
 *
 * Workflow contracts live here:
 *
 * - `requiredWorkflowTokens` — tokens that must appear ANYWHERE in the
 *   pull-request workflow. Cheap, but satisfied by a substring in any
 *   job or comment.
 * - `requiredWorkflowJobContracts` — executable fields required inside ONE
 *   named parsed YAML job. A gate that names the job it belongs to cannot be
 *   satisfied by the same command existing in a different lane (or in a
 *   comment), which is the failure mode the loose form allows.
 * - `requiredOpenSpecStaticChecks` — named, unconditional OpenSpec steps in
 *   static-checks, including strict validation and its regression tests.
 */
import { loadBudgets } from '../ci/budget-config.mjs';
import { CI_SUITES } from '../playwright/ci-e2e-plan.mjs';

const gates = CI_SUITES.find(({ name }) => name === 'gates');

const budgets = loadBudgets(
  new URL('../../config/ci/budgets.json', import.meta.url),
);

// Live branch protection requires only the aggregator; it needs every
// fan-out job, Build Test included (CI-SPEED slice 5).
export const requiredProtectedContexts = ['Lint and Test'];

// CI-SPEED round 2 folded Schema Bridge into static-checks, the corpus
// suites and Validate Combat Suite into unit-test-shards, and Build and
// Linux Pack into simulation-checks; the token contracts below still pin
// each of those gates.
export const requiredAggregatorNeeds = [
  'detect-changes',
  'static-checks',
  'unit-test-shards',
  'simulation-checks',
  'build-test',
  'e2e',
];

export const requiredOpenSpecStaticChecks = {
  id: 'openspec-static-checks',
  jobId: 'static-checks',
  steps: [
    {
      name: 'Validate OpenSpec specs (strict)',
      run: 'npm run openspec:validate',
    },
    {
      name: 'Validate OpenSpec delta headers and regression tests',
      run: 'node --test scripts/qc/openspec-delta-headers.test.mjs\nnpm run qc:openspec-ci:validate',
    },
  ],
  stepIf: '${{ !cancelled() }}',
};

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
      'name: Verify generated Zod matches JSON Schema',
      'npm run schema:gen-check',
      'run_schema_validation_only.py --shape all --strict',
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
      'node scripts/playwright/run-ci-e2e.mjs test e2e/tactical-map-visual-smoke.spec.ts --project=chromium',
      'name: Run customizer library suite',
      'node scripts/playwright/run-ci-e2e.mjs test e2e/customizer-library-open.spec.ts --project=chromium',
    ],
  },
  {
    id: 'desktop-build-required-platforms',
    tokens: [
      'name: Build Test / ${{ matrix.platform }}',
      'platform: win',
      'platform: mac',
      'name: Build complete Linux installer and unpacked application',
      'npx electron-builder --linux tar.gz --publish never',
    ],
  },
];

/**
 * The per-PR browser gates (add-customizer-pr-regression-gate, and the seam
 * trust anchors of add-seam-trust-anchor-journeys) run in the `e2e` job, a
 * fixed two-shard matrix. Every token is scoped to that job block, so the
 * contract pins the gate itself, not the workflow's vocabulary:
 *
 * - each shard fetches the record-sheet assets in ITS OWN checkout and
 *   validates them strictly before building, so a missing template fails
 *   instead of degrading to the CDN fallback;
 * - each shard builds the E2E-mode production app and serves it from
 *   `.next/standalone/server.js`;
 * - the exact six-spec gate invocation through the repo runner wrapper, in
 *   every shard of the fixed matrix, so no pack and no shard can be dropped;
 *   `--retries=0`, so a flaky regression is never retried to green;
 *   `--trace=retain-on-failure`, because the config's
 *   `trace: 'on-first-retry'` produces nothing at zero retries.
 */
const E2E_CHANGE_GATE_IF =
  "needs.detect-changes.outputs.code == 'true' || needs.detect-changes.outputs.e2e == 'true'";

export const requiredWorkflowJobContracts = [
  {
    id: 'customizer-regressions-gate',
    jobId: 'e2e',
    jobName: 'E2E (${{ matrix.shard }}/2)',
    requiredNeeds: ['detect-changes'],
    timeoutMinutes: budgets.timeouts.e2e.minutes,
    matrixShards: [1, 2],
    skipIf:
      "needs.detect-changes.outputs.code != 'true' && needs.detect-changes.outputs.e2e != 'true'",
    changeGateIf: E2E_CHANGE_GATE_IF,
    uploadFailureIf: `failure() && (${E2E_CHANGE_GATE_IF})`,
    // The gate writes its own report folder (the smoke suites write theirs
    // after it), and the failure upload must carry it.
    uploadPaths: [
      'test-results',
      'playwright-report',
      'playwright-report-gates',
      'playwright-report-smoke',
    ],
    extraStepIfs: {
      'Upload E2E durations and test census': `always() && (${E2E_CHANGE_GATE_IF})`,
      'Run customizer library suite': `\${{ !cancelled() && (${E2E_CHANGE_GATE_IF}) }}`,
      'Run tactical-map visual smoke': `\${{ !cancelled() && (${E2E_CHANGE_GATE_IF}) }}`,
      'Upload library-open screenshots': `always() && (${E2E_CHANGE_GATE_IF})`,
    },
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
        id: 'browser-gates-playwright',
        run: [
          'node scripts/playwright/run-ci-e2e.mjs test',
          ...gates.files.map((file) => `e2e/${file}`),
          '--project=chromium',
          ...gates.options,
          `--workers=${gates.workers}`,
          '--shard=${{ matrix.shard }}/2',
          '--output=test-results/gates',
        ].join(' '),
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
    id: 'openspec:validate',
    tokens: ['npx --yes @fission-ai/openspec@1.5.0 validate --all --strict'],
  },
  {
    id: 'verify:rules',
    tokens: [
      'validate:combat:gaps',
      '--expect-total=0',
      '--expect-total=151',
      'npm run openspec:validate',
    ],
  },
];
