import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;
const validatorPath = path.resolve(
  repoRoot,
  'scripts/qc/validate-openspec-ci-quality.mjs',
);
const workflowPath = path.resolve(repoRoot, '.github/workflows/pr-checks.yml');
const e2eTimeoutMinutes: number = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'config/ci/budgets.json'), 'utf8'),
).timeouts.e2e.minutes;

/**
 * The per-PR browser gates live in the `e2e` shard matrix: each shard
 * validates the record-sheet assets, builds the E2E-mode production app and
 * runs the exact gate invocation below against it. The validator scopes the
 * contract to that job, so the mutations below move / weaken it and prove it
 * still fails.
 */
const GATE_JOB = 'e2e';
const CHANGE_GATE_IF =
  "needs.detect-changes.outputs.code == 'true' || needs.detect-changes.outputs.e2e == 'true'";
const GATE_COMMAND =
  'run: node scripts/playwright/run-ci-e2e.mjs test ' +
  'e2e/active-session-recovery.spec.ts ' +
  'e2e/seam-roster-materialization-handoff.spec.ts ' +
  'e2e/seam-fresh-construction-no-instant-defeat.spec.ts ' +
  'e2e/customizer-equipment-catalog.spec.ts ' +
  'e2e/customizer-record-sheet-rendering.spec.ts ' +
  'e2e/customizer-edit-recovery.spec.ts ' +
  'e2e/customizer-mech-crew-roster.spec.ts ' +
  'e2e/gm-campaign-ledger-control-plane.spec.ts ' +
  '--project=chromium --retries=0 --trace=retain-on-failure ' +
  '--workers=1 --shard=${{ matrix.shard }}/2 --output=test-results/gates';

interface ValidatorManifest {
  status: string;
  errors: Array<{
    code: string;
    id?: string;
    jobId?: string;
    missing?: string[];
  }>;
  workflowJobContracts: Array<{ id: string; jobId: string; present: boolean }>;
  aggregatorNeeds: { expected: string[]; actual: string[] };
}

function readWorkflow(): string {
  return fs.readFileSync(workflowPath, 'utf-8');
}

/** Rewrite only one job block: from its key to the next top-level job key. */
function mutateJob(
  workflow: string,
  jobId: string,
  mutate: (block: string) => string,
): string {
  const start = workflow.indexOf(`\n  ${jobId}:\n`);
  expect(start).toBeGreaterThan(-1);
  const next = /\n {2}[a-z0-9-]+:\n/g;
  next.lastIndex = start + 1;
  const match = next.exec(workflow);
  const end = match ? match.index : workflow.length;
  expect(end).toBeGreaterThan(start);
  const block = workflow.slice(start, end);
  const mutated = mutate(block);
  expect(mutated).not.toBe(block);
  return workflow.slice(0, start) + mutated + workflow.slice(end);
}

function jobErrors(manifest: ValidatorManifest): ValidatorManifest['errors'] {
  return manifest.errors.filter(
    (entry) =>
      entry.code === 'workflow-job-token-missing' ||
      entry.code === 'workflow-job-missing' ||
      entry.code === 'workflow-job-condition-invalid',
  );
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function writeJson(filePath: string, value: unknown): void {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function runValidator(args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(NODE, [validatorPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
}

describe('OpenSpec CI quality QC validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-openspec-ci-quality-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current PR workflow, branch protection, and package wiring', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('workflowContracts=10/10');
    expect(result.stdout).toContain('protectedContexts=1');
    expect(result.stdout).toMatch(/activeOpenSpecChanges=\d+/);
    expect(result.stdout).toMatch(/accountedActiveOpenSpecChanges=\d+/);
    expect(result.stdout).toContain('errors=0');
    expect(result.stderr).toBe('');
  });

  it('emits automation-friendly JSON for the CI contract', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      protectedContexts: string[];
      aggregatorNeeds: { expected: string[]; actual: string[] };
      unaccountedActiveOpenSpecChanges: string[];
    };

    expect(manifest.status).toBe('pass');
    expect(manifest.unaccountedActiveOpenSpecChanges).toEqual([]);
    expect(manifest.protectedContexts).toEqual(['Lint and Test']);
    expect(manifest.aggregatorNeeds.actual).toEqual(
      expect.arrayContaining(manifest.aggregatorNeeds.expected),
    );
  });

  it('rejects active OpenSpec changes that are not in the active-change ledger', () => {
    const changesDir = path.join(tempDir, 'changes');
    fs.mkdirSync(path.join(changesDir, 'unaccounted-change'), {
      recursive: true,
    });
    const ledgerPath = path.join(tempDir, 'active-change-ledger.json');
    writeJson(ledgerPath, { allowedActiveChanges: [] });

    const result = runValidator(['--json'], {
      MEKSTATION_OPENSPEC_CHANGES_DIR: changesDir,
      MEKSTATION_ACTIVE_OPENSPEC_LEDGER_PATH: ledgerPath,
    });

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ code: string; unaccountedActiveChanges?: string[] }>;
      unaccountedActiveOpenSpecChanges: string[];
    };
    expect(manifest.unaccountedActiveOpenSpecChanges).toEqual([
      'unaccounted-change',
    ]);
    expect(manifest.errors).toContainEqual(
      expect.objectContaining({
        code: 'active-openspec-changes-present',
        unaccountedActiveChanges: ['unaccounted-change'],
      }),
    );
  });

  describe('active change accounting across legacy and colocated formats', () => {
    const entry = {
      name: 'example-change',
      status: 'in-progress',
      reason: 'Awaiting verification.',
      lastReviewed: '2026-11-08',
    };

    function accounting(
      legacyEntries: unknown[],
      colocated: unknown = entry,
      directoryName = entry.name,
    ) {
      const changesDir = path.join(tempDir, 'changes');
      const ledgerPath = path.join(tempDir, 'active-change-ledger.json');
      fs.mkdirSync(path.join(changesDir, directoryName), { recursive: true });
      writeJson(ledgerPath, { allowedActiveChanges: legacyEntries });
      if (colocated !== null) {
        writeJson(
          path.join(changesDir, directoryName, '.ledger.json'),
          colocated,
        );
      }
      return runValidator(['--json'], {
        MEKSTATION_OPENSPEC_CHANGES_DIR: changesDir,
        MEKSTATION_ACTIVE_OPENSPEC_LEDGER_PATH: ledgerPath,
      });
    }

    it('accepts a colocated-only change without the legacy file', () => {
      accounting([]);
      fs.unlinkSync(path.join(tempDir, 'active-change-ledger.json'));
      const result = runValidator(['--json'], {
        MEKSTATION_OPENSPEC_CHANGES_DIR: path.join(tempDir, 'changes'),
        MEKSTATION_ACTIVE_OPENSPEC_LEDGER_PATH: path.join(
          tempDir,
          'active-change-ledger.json',
        ),
      });
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).accountedActiveOpenSpecChanges).toEqual([
        entry,
      ]);
    });

    it('accepts an in-flight legacy-only addition', () => {
      expect(accounting([entry], null).status).toBe(0);
    });

    it('counts identical entries from both formats once', () => {
      const result = accounting([entry]);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).accountedActiveOpenSpecChanges).toEqual([
        entry,
      ]);
    });

    it.each(['name', 'status', 'reason', 'lastReviewed'])(
      'rejects a missing colocated-only %s',
      (field) => {
        const incomplete: Record<string, unknown> = { ...entry };
        delete incomplete[field];
        const result = accounting([], incomplete);
        expect(result.status).toBe(1);
        expect(JSON.parse(result.stdout).errors).toContainEqual(
          expect.objectContaining({ code: 'active-openspec-ledger-invalid' }),
        );
      },
    );

    it.each(['name', 'status', 'reason', 'lastReviewed'])(
      'rejects a missing colocated %s even when legacy metadata is valid',
      (field) => {
        const incomplete: Record<string, unknown> = { ...entry };
        delete incomplete[field];
        const result = accounting([entry], incomplete);
        expect(result.status).toBe(1);
        expect(JSON.parse(result.stdout).errors).toContainEqual(
          expect.objectContaining({ code: 'active-openspec-ledger-invalid' }),
        );
      },
    );

    it.each(['name', 'status', 'reason', 'lastReviewed'])(
      'rejects missing legacy %s even when colocated metadata is valid',
      (field) => {
        const incomplete: Record<string, unknown> = { ...entry };
        delete incomplete[field];
        expect(accounting([incomplete]).status).toBe(1);
      },
    );

    it('rejects conflicting metadata instead of choosing a format', () => {
      expect(
        accounting([{ ...entry, reason: 'Conflicting review.' }]).status,
      ).toBe(1);
    });

    it('rejects stale legacy entries for missing or archived changes', () => {
      const result = accounting([{ ...entry, name: 'archived-change' }]);
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout).errors).toContainEqual(
        expect.objectContaining({
          code: 'stale-active-openspec-ledger-entry',
          staleAccountedActiveChanges: ['archived-change'],
        }),
      );
    });

    it('excludes archived metadata and accepts two independent new changes', () => {
      accounting([]);
      const changesDir = path.join(tempDir, 'changes');
      const second = { ...entry, name: 'second-change' };
      writeJson(path.join(changesDir, second.name, '.ledger.json'), second);
      writeText(
        path.join(changesDir, 'archive', 'old-change', '.ledger.json'),
        '{',
      );
      const result = runValidator(['--json'], {
        MEKSTATION_OPENSPEC_CHANGES_DIR: changesDir,
        MEKSTATION_ACTIVE_OPENSPEC_LEDGER_PATH: path.join(
          tempDir,
          'active-change-ledger.json',
        ),
      });
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).accountedActiveOpenSpecChanges).toEqual([
        entry,
        second,
      ]);
    });

    it('rejects malformed colocated JSON even when legacy metadata is valid', () => {
      accounting([entry]);
      writeText(path.join(tempDir, 'changes', entry.name, '.ledger.json'), '{');
      const result = runValidator(['--json'], {
        MEKSTATION_OPENSPEC_CHANGES_DIR: path.join(tempDir, 'changes'),
        MEKSTATION_ACTIVE_OPENSPEC_LEDGER_PATH: path.join(
          tempDir,
          'active-change-ledger.json',
        ),
      });
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout).errors).toContainEqual(
        expect.objectContaining({ code: 'active-openspec-ledger-invalid' }),
      );
    });
  });

  it('rejects branch protection that drops the required aggregator context', () => {
    const branchProtection = fs
      .readFileSync(
        path.join(repoRoot, '.github', 'scripts', 'setup-branch-protection.sh'),
        'utf-8',
      )
      .replace('"Lint and Test"', '"Lint and Docs"');
    const branchProtectionPath = path.join(
      tempDir,
      'setup-branch-protection.sh',
    );
    writeText(branchProtectionPath, branchProtection);

    const result = runValidator(['--json'], {
      MEKSTATION_BRANCH_PROTECTION_PATH: branchProtectionPath,
    });

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ code: string; context?: string }>;
    };
    expect(manifest.errors).toContainEqual(
      expect.objectContaining({
        code: 'branch-protection-context-missing',
        context: 'Lint and Test',
      }),
    );
  });

  it('rejects package wiring that omits the OpenSpec CI validator from verify:qc', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8'),
    );
    packageJson.scripts['verify:qc'] = packageJson.scripts['verify:qc'].replace(
      'npm run qc:openspec-ci:validate && ',
      '',
    );
    const packageJsonPath = path.join(tempDir, 'package.json');
    writeJson(packageJsonPath, packageJson);

    const result = runValidator(['--json'], {
      MEKSTATION_PACKAGE_JSON_PATH: packageJsonPath,
    });

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ code: string; scriptId?: string; token?: string }>;
    };
    expect(manifest.errors).toContainEqual(
      expect.objectContaining({
        code: 'package-script-token-missing',
        scriptId: 'verify:qc',
        token: 'qc:openspec-ci:validate',
      }),
    );
  });

  it('rejects a workflow that drops the jest-dom skip list check', () => {
    const workflow = readWorkflow();
    const mutated = workflow.replace(
      'run: node scripts/jest/jest-dom-usage.js --check',
      'run: node scripts/jest/jest-dom-usage.js',
    );
    expect(mutated).not.toBe(workflow);
    const mutatedPath = path.join(tempDir, 'pr-checks.yml');
    writeText(mutatedPath, mutated);
    const result = runValidator(['--json'], {
      MEKSTATION_PR_WORKFLOW_PATH: mutatedPath,
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('jest-dom-skip-list-is-safe');
  });

  describe('per-PR browser regression gates', () => {
    function runWithWorkflow(workflow: string): ValidatorManifest {
      const mutatedPath = path.join(tempDir, 'pr-checks.yml');
      writeText(mutatedPath, workflow);
      const result = runValidator(['--json'], {
        MEKSTATION_PR_WORKFLOW_PATH: mutatedPath,
      });
      return JSON.parse(result.stdout) as ValidatorManifest;
    }

    function expectJobError(
      manifest: ValidatorManifest,
      code: string,
      jobId: string,
    ): void {
      expect(manifest.status).toBe('fail');
      expect(manifest.errors).toContainEqual(
        expect.objectContaining({ code, jobId }),
      );
    }

    it('accepts the shipped e2e job', () => {
      const manifest = runWithWorkflow(readWorkflow());

      expect(jobErrors(manifest)).toEqual([]);
      expect(manifest.workflowJobContracts).toEqual([
        expect.objectContaining({
          id: 'customizer-regressions-gate',
          jobId: GATE_JOB,
          present: true,
        }),
      ]);
      expect(manifest.aggregatorNeeds.actual).toContain(GATE_JOB);
    });

    it('rejects the gate command when it only exists outside the gate job', () => {
      const relocated = mutateJob(readWorkflow(), GATE_JOB, (block) =>
        block.replace(
          GATE_COMMAND,
          'run: echo "browser gates ran somewhere else"',
        ),
      ).concat(`\n# ${GATE_COMMAND}\n`);

      // The exact command is still a substring of the workflow: only its
      // job scope changed.
      expect(relocated).toContain(GATE_COMMAND);

      const manifest = runWithWorkflow(relocated);

      expect(manifest.status).toBe('fail');
      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          id: 'customizer-regressions-gate',
          jobId: GATE_JOB,
          missing: [GATE_COMMAND],
        }),
      );
    });

    it('rejects an in-job comment or echo that only mentions the gate command', () => {
      const commented = mutateJob(readWorkflow(), GATE_JOB, (block) =>
        block
          .replace(GATE_COMMAND, 'run: echo "browser gates moved to a comment"')
          .concat('      # ' + GATE_COMMAND + String.fromCharCode(10)),
      );
      const manifest = runWithWorkflow(commented);
      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          jobId: GATE_JOB,
          missing: [GATE_COMMAND],
        }),
      );
    });

    it('rejects a gate step disabled with if false', () => {
      const disabled = mutateJob(readWorkflow(), GATE_JOB, (block) =>
        block.replace(
          '      - name: Run seam anchor, customizer and GM ledger regression gates' +
            String.fromCharCode(10) +
            '        if: ' +
            CHANGE_GATE_IF,
          '      - name: Run seam anchor, customizer and GM ledger regression gates' +
            String.fromCharCode(10) +
            '        if: false',
        ),
      );
      expectJobError(
        runWithWorkflow(disabled),
        'workflow-job-condition-invalid',
        GATE_JOB,
      );
    });

    it('rejects a gate step that continues on error', () => {
      const nonBlocking = mutateJob(readWorkflow(), GATE_JOB, (block) =>
        block.replace(
          '        ' + GATE_COMMAND,
          '        continue-on-error: true' +
            String.fromCharCode(10) +
            '        ' +
            GATE_COMMAND,
        ),
      );
      expectJobError(
        runWithWorkflow(nonBlocking),
        'workflow-job-condition-invalid',
        GATE_JOB,
      );
    });

    it.each([
      [
        'NEXT_PUBLIC_E2E_TEST env',
        GATE_JOB,
        (block: string) =>
          block.replace(
            "          NEXT_PUBLIC_E2E_TEST: 'true'",
            "          NEXT_PUBLIC_E2E_TEST: 'false'",
          ),
        'workflow-job-condition-invalid',
      ],
      [
        'measured gate timeout shortened',
        GATE_JOB,
        (block: string) =>
          block.replace(
            `    timeout-minutes: ${e2eTimeoutMinutes}`,
            `    timeout-minutes: ${e2eTimeoutMinutes - 1}`,
          ),
        'workflow-job-condition-invalid',
      ],
      [
        'measured gate timeout widened',
        GATE_JOB,
        (block: string) =>
          block.replace(
            `    timeout-minutes: ${e2eTimeoutMinutes}`,
            `    timeout-minutes: ${e2eTimeoutMinutes + 1}`,
          ),
        'workflow-job-condition-invalid',
      ],
      [
        'gate job name',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '    name: E2E (${{ matrix.shard }}/2)',
            '    name: E2E Gate (${{ matrix.shard }}/2)',
          ),
        'workflow-job-token-missing',
      ],
      [
        'required needs',
        GATE_JOB,
        (block: string) =>
          block.replace('    needs: detect-changes', '    needs: []'),
        'workflow-job-token-missing',
      ],
      [
        'skip condition',
        GATE_JOB,
        (block: string) =>
          block.replace(
            "        if: needs.detect-changes.outputs.code != 'true' && needs.detect-changes.outputs.e2e != 'true'",
            '        if: false',
          ),
        'workflow-job-condition-invalid',
      ],
      [
        'upload failure condition',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '        if: failure() && (' + CHANGE_GATE_IF + ')',
            '        if: failure()',
          ),
        'workflow-job-condition-invalid',
      ],
      [
        'setup action identity',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '        uses: ./.github/actions/setup-node-and-install',
            '        uses: actions/setup-node@v6',
          ),
        'workflow-job-token-missing',
      ],
      [
        'cache condition',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '      - name: Cache Playwright chromium browser\n        if: ' +
              CHANGE_GATE_IF,
            '      - name: Cache Playwright chromium browser\n        if: always()',
          ),
        'workflow-job-condition-invalid',
      ],
      [
        'smoke suite condition',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '        if: ${{ !cancelled() && (' + CHANGE_GATE_IF + ') }}',
            '        if: always()',
          ),
        'workflow-job-condition-invalid',
      ],
      [
        'shard matrix',
        GATE_JOB,
        (block: string) =>
          block.replace('        shard: [1, 2]', '        shard: [1]'),
        'workflow-job-condition-invalid',
      ],
      [
        'shard matrix exclusion',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '        shard: [1, 2]',
            '        shard: [1, 2]\n        exclude:\n          - shard: 2',
          ),
        'workflow-job-condition-invalid',
      ],
      [
        'required in-job step order',
        GATE_JOB,
        (block: string) =>
          block.replace(
            /(\n      - name: Validate record-sheet assets[\s\S]*?\n        run: npm run validate:assets:strict\n)(\n      - name: Build production app[\s\S]*?\n        run: npm run build\n)/,
            '$2$1',
          ),
        'workflow-job-condition-invalid',
      ],
    ] as const)(
      'rejects the individually weakened %s contract',
      (_label, jobId, mutate, expectedCode) => {
        const manifest = runWithWorkflow(
          mutateJob(readWorkflow(), jobId, mutate),
        );
        expectJobError(manifest, expectedCode, jobId);
      },
    );

    it.each([
      [
        'disabled gate job',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '    name: E2E (${{ matrix.shard }}/2)',
            '    if: false\n    name: E2E (${{ matrix.shard }}/2)',
          ),
      ],
      [
        'ignored job failure expression',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '    name: E2E (${{ matrix.shard }}/2)',
            '    continue-on-error: ${{ true }}\n    name: E2E (${{ matrix.shard }}/2)',
          ),
      ],
      [
        'ignored step failure string',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '        ' + GATE_COMMAND,
            "        continue-on-error: 'true'\n        " + GATE_COMMAND,
          ),
      ],
      [
        'ignored step failure expression',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '        ' + GATE_COMMAND,
            '        continue-on-error: ${{ true }}\n        ' + GATE_COMMAND,
          ),
      ],
      [
        'disabled setup with misleading gate terms',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '      - name: Setup Node + caches + install deps\n        if: ' +
              CHANGE_GATE_IF,
            '      - name: Setup Node + caches + install deps\n        if: false && (' +
              CHANGE_GATE_IF +
              ')',
          ),
      ],
      [
        'unnamed unguarded step',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '    steps:',
            '    steps:\n      - run: echo unexpected',
          ),
      ],
      [
        'production hooks removed',
        GATE_JOB,
        (block: string) =>
          block.replace(
            "NEXT_PUBLIC_E2E_MODE: 'true'",
            "NEXT_PUBLIC_E2E_MODE: 'false'",
          ),
      ],
      [
        'development server substituted',
        GATE_JOB,
        (block: string) =>
          block.replace('node .next/standalone/server.js', 'node server.js'),
      ],
      [
        'invalid standalone hostname',
        GATE_JOB,
        (block: string) =>
          block.replace("HOSTNAME: '127.0.0.1'", "HOSTNAME: 'localhost'"),
      ],
      [
        // The smoke suites run next and write the default report folder.
        'gate report written to the shared report folder',
        GATE_JOB,
        (block: string) =>
          block.replace(
            '          PLAYWRIGHT_HTML_OUTPUT_DIR: playwright-report-gates\n',
            '',
          ),
      ],
      [
        'default report dropped from the failure upload',
        GATE_JOB,
        (block: string) => block.replace('            playwright-report\n', ''),
      ],
      [
        'smoke report dropped from the failure upload',
        GATE_JOB,
        (block: string) =>
          block.replace('            playwright-report-smoke\n', ''),
      ],
      [
        'gate report dropped from the failure upload',
        GATE_JOB,
        (block: string) =>
          block.replace('            playwright-report-gates\n', ''),
      ],
      [
        'failure report upload replaced by echo',
        GATE_JOB,
        (block: string) =>
          block.replace(
            /(- name: Upload Playwright report\n        if: [^\n]*\n        )uses: actions\/upload-artifact@v7/,
            '$1run: echo upload-artifact',
          ),
      ],
    ] as const)('rejects %s', (_label, jobId, mutate) => {
      const manifest = runWithWorkflow(
        mutateJob(readWorkflow(), jobId, mutate),
      );
      expectJobError(manifest, 'workflow-job-condition-invalid', jobId);
    });

    it('rejects the gate command when only an environment value mentions it', () => {
      const manifest = runWithWorkflow(
        mutateJob(readWorkflow(), GATE_JOB, (block) =>
          block
            .replace('        ' + GATE_COMMAND, '        run: echo missing')
            .replace(
              "          HOSTNAME: '127.0.0.1'",
              "          HOSTNAME: '127.0.0.1'" +
                String.fromCharCode(10) +
                '          PREVIOUS_COMMAND: ' +
                JSON.stringify(GATE_COMMAND),
            ),
        ),
      );
      expectJobError(manifest, 'workflow-job-token-missing', GATE_JOB);
      expect(
        manifest.errors.some((error) => error.code === 'workflow-yaml-invalid'),
      ).toBe(false);
    });

    it.each([
      [
        'allows Playwright retries',
        (block: string) => block.replace(' --retries=0', ''),
      ],
      [
        // `--retries=0` plus the config default `trace: 'on-first-retry'`
        // records nothing, so a failure would ship no trace.
        'keeps the retry-only trace mode',
        (block: string) =>
          block.replace(
            ' --trace=retain-on-failure',
            ' --trace=on-first-retry',
          ),
      ],
      [
        'drops a customizer spec pack',
        (block: string) =>
          block.replace(' e2e/customizer-equipment-catalog.spec.ts', ''),
      ],
      [
        'drops a seam trust anchor',
        (block: string) =>
          block.replace(' e2e/seam-roster-materialization-handoff.spec.ts', ''),
      ],
      [
        'runs one shard for every matrix leg',
        (block: string) =>
          block.replace(' --shard=${{ matrix.shard }}/2', ' --shard=1/2'),
      ],
    ] as const)('rejects a browser gate that %s', (_label, mutate) => {
      const manifest = runWithWorkflow(
        mutateJob(readWorkflow(), GATE_JOB, mutate),
      );

      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          jobId: GATE_JOB,
          missing: [GATE_COMMAND],
        }),
      );
    });

    it('rejects an E2E shard whose own checkout does not fetch record-sheet assets', () => {
      const unfetched = mutateJob(readWorkflow(), GATE_JOB, (block) =>
        block.replace("\n          fetch-assets: 'true'", ''),
      );

      // Other jobs still fetch assets; the E2E shard's own checkout does not.
      expect(unfetched).toContain("fetch-assets: 'true'");

      const manifest = runWithWorkflow(unfetched);

      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          jobId: GATE_JOB,
          missing: ["fetch-assets: 'true'"],
        }),
      );
    });

    it('rejects an E2E shard without the strict record-sheet asset check', () => {
      const unchecked = mutateJob(readWorkflow(), GATE_JOB, (block) =>
        block.replace(
          'run: npm run validate:assets:strict',
          'run: echo "assets assumed present"',
        ),
      );

      // prepare-build still runs the strict asset gate globally.
      expect(unchecked).toContain('run: npm run validate:assets:strict');

      const manifest = runWithWorkflow(unchecked);

      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          jobId: GATE_JOB,
          missing: ['run: npm run validate:assets:strict'],
        }),
      );
    });

    it.each([GATE_JOB])('rejects a deleted %s job', (jobId) => {
      const deleted = mutateJob(readWorkflow(), jobId, () => '\n');

      const manifest = runWithWorkflow(deleted);

      expect(manifest.errors).toContainEqual(
        expect.objectContaining({ code: 'workflow-job-missing', jobId }),
      );
    });

    it.each([GATE_JOB])(
      'rejects an aggregator that stops requiring %s',
      (jobId) => {
        const unwired = readWorkflow().replace(`        ${jobId},\n`, '');

        // The job still exists — it just no longer blocks "Lint and Test".
        expect(unwired).toContain(`\n  ${jobId}:\n`);

        const manifest = runWithWorkflow(unwired);

        expect(manifest.aggregatorNeeds.actual).not.toContain(jobId);
        expect(manifest.errors).toContainEqual(
          expect.objectContaining({ code: 'aggregator-need-missing', jobId }),
        );
      },
    );
  });
});
