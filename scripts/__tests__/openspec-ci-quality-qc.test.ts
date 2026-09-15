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

/**
 * The exact customizer gate invocation the workflow must carry. The
 * validator scopes this to the `customizer-regressions` job, so the
 * mutations below move / weaken it and prove the contract still fails.
 */
const CUSTOMIZER_GATE_COMMAND =
  'run: node scripts/playwright/run-playwright.mjs test ' +
  'e2e/customizer-equipment-catalog.spec.ts ' +
  'e2e/customizer-record-sheet-rendering.spec.ts ' +
  'e2e/customizer-edit-recovery.spec.ts ' +
  '--project=chromium --retries=0 --trace=retain-on-failure';

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

/** Rewrite only the `customizer-regressions` job block. */
function mutateCustomizerJob(
  workflow: string,
  mutate: (block: string) => string,
): string {
  const start = workflow.indexOf('\n  customizer-regressions:\n');
  expect(start).toBeGreaterThan(-1);
  const end = workflow.indexOf('\n  desktop-typecheck:\n', start);
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
    expect(result.stdout).toContain('workflowContracts=8/8');
    expect(result.stdout).toContain('protectedContexts=4');
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
    expect(manifest.protectedContexts).toEqual([
      'Lint and Test',
      'Build Test / win',
      'Build Test / mac',
      'Build Test / linux',
    ]);
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

  it('rejects branch protection that drops a required build context', () => {
    const branchProtection = fs
      .readFileSync(
        path.join(repoRoot, '.github', 'scripts', 'setup-branch-protection.sh'),
        'utf-8',
      )
      .replace('"Build Test / linux"', '"Build Test / docs"');
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
        context: 'Build Test / linux',
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

  describe('customizer browser regression gate', () => {
    function runWithWorkflow(workflow: string): ValidatorManifest {
      const mutatedPath = path.join(tempDir, 'pr-checks.yml');
      writeText(mutatedPath, workflow);
      const result = runValidator(['--json'], {
        MEKSTATION_PR_WORKFLOW_PATH: mutatedPath,
      });
      return JSON.parse(result.stdout) as ValidatorManifest;
    }

    it('accepts the shipped customizer-regressions job', () => {
      const manifest = runWithWorkflow(readWorkflow());

      expect(jobErrors(manifest)).toEqual([]);
      expect(manifest.workflowJobContracts).toContainEqual(
        expect.objectContaining({
          id: 'customizer-regressions-gate',
          jobId: 'customizer-regressions',
          present: true,
        }),
      );
      expect(manifest.aggregatorNeeds.actual).toContain(
        'customizer-regressions',
      );
    });

    it('rejects the gate command when it only exists outside the customizer job', () => {
      const relocated = mutateCustomizerJob(readWorkflow(), (block) =>
        block.replace(
          CUSTOMIZER_GATE_COMMAND,
          'run: echo "customizer regressions ran somewhere else"',
        ),
      ).concat(`\n# ${CUSTOMIZER_GATE_COMMAND}\n`);

      // The exact command is still a substring of the workflow: only its
      // job scope changed.
      expect(relocated).toContain(CUSTOMIZER_GATE_COMMAND);

      const manifest = runWithWorkflow(relocated);

      expect(manifest.status).toBe('fail');
      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          id: 'customizer-regressions-gate',
          jobId: 'customizer-regressions',
          missing: [CUSTOMIZER_GATE_COMMAND],
        }),
      );
    });

    it('rejects an in-job comment or echo that only mentions the gate command', () => {
      const commented = mutateCustomizerJob(readWorkflow(), (block) =>
        block
          .replace(
            CUSTOMIZER_GATE_COMMAND,
            'run: echo "customizer gate moved to a comment"',
          )
          .concat(
            '      # ' + CUSTOMIZER_GATE_COMMAND + String.fromCharCode(10),
          ),
      );
      const manifest = runWithWorkflow(commented);
      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          jobId: 'customizer-regressions',
          missing: [CUSTOMIZER_GATE_COMMAND],
        }),
      );
    });

    it('rejects a gate step disabled with if false', () => {
      const disabled = mutateCustomizerJob(readWorkflow(), (block) =>
        block.replace(
          '      - name: Run customizer browser regressions' +
            String.fromCharCode(10) +
            "        if: needs.detect-changes.outputs.code == 'true' || needs.detect-changes.outputs.e2e == 'true'",
          '      - name: Run customizer browser regressions' +
            String.fromCharCode(10) +
            '        if: false',
        ),
      );
      const manifest = runWithWorkflow(disabled);
      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-condition-invalid',
          jobId: 'customizer-regressions',
        }),
      );
    });

    it('rejects a gate step that continues on error', () => {
      const nonBlocking = mutateCustomizerJob(readWorkflow(), (block) =>
        block.replace(
          '        ' + CUSTOMIZER_GATE_COMMAND,
          '        continue-on-error: true' +
            String.fromCharCode(10) +
            '        ' +
            CUSTOMIZER_GATE_COMMAND,
        ),
      );
      const manifest = runWithWorkflow(nonBlocking);
      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-condition-invalid',
          jobId: 'customizer-regressions',
        }),
      );
    });

    it.each([
      [
        'NEXT_PUBLIC_E2E_TEST env',
        (block: string) =>
          block.replace(
            "          NEXT_PUBLIC_E2E_TEST: 'true'",
            "          NEXT_PUBLIC_E2E_TEST: 'false'",
          ),
        'workflow-job-condition-invalid',
      ],
      [
        '20-minute timeout',
        (block: string) =>
          block.replace('    timeout-minutes: 20', '    timeout-minutes: 19'),
        'workflow-job-condition-invalid',
      ],
      [
        'job name',
        (block: string) =>
          block.replace(
            '    name: Customizer Regressions',
            '    name: Customizer Regression Gate',
          ),
        'workflow-job-token-missing',
      ],
      [
        'required needs',
        (block: string) =>
          block.replace(
            '    needs: [detect-changes, install-deps]',
            '    needs: [detect-changes]',
          ),
        'workflow-job-token-missing',
      ],
      [
        'skip condition',
        (block: string) =>
          block.replace(
            "        if: needs.detect-changes.outputs.code != 'true' && needs.detect-changes.outputs.e2e != 'true'",
            '        if: false',
          ),
        'workflow-job-condition-invalid',
      ],
      [
        'upload failure condition',
        (block: string) =>
          block.replace(
            "        if: failure() && (needs.detect-changes.outputs.code == 'true' || needs.detect-changes.outputs.e2e == 'true')",
            '        if: failure()',
          ),
        'workflow-job-condition-invalid',
      ],
      [
        'setup action identity',
        (block: string) =>
          block.replace(
            '        uses: ./.github/actions/setup-node-and-install',
            '        uses: actions/setup-node@v6',
          ),
        'workflow-job-token-missing',
      ],
      [
        'cache condition',
        (block: string) =>
          block.replace(
            "      - name: Cache Playwright chromium browser\n        if: needs.detect-changes.outputs.code == 'true' || needs.detect-changes.outputs.e2e == 'true'",
            '      - name: Cache Playwright chromium browser\n        if: always()',
          ),
        'workflow-job-condition-invalid',
      ],
      [
        'required in-job step order',
        (block: string) =>
          block.replace(
            /(\n      - name: Validate record-sheet assets[\s\S]*?\n        run: npm run validate:assets:strict\n)(\n      - name: Build production app[\s\S]*?\n        run: npm run build\n)/,
            '$2$1',
          ),
        'workflow-job-condition-invalid',
      ],
    ] as const)(
      'rejects the individually weakened %s contract',
      (_label, mutate, expectedCode) => {
        const manifest = runWithWorkflow(
          mutateCustomizerJob(readWorkflow(), mutate),
        );
        expect(manifest.status).toBe('fail');
        expect(manifest.errors).toContainEqual(
          expect.objectContaining({
            code: expectedCode,
            jobId: 'customizer-regressions',
          }),
        );
      },
    );

    it.each([
      [
        'disabled job',
        (block: string) =>
          block.replace(
            '    name: Customizer Regressions',
            '    if: false\n    name: Customizer Regressions',
          ),
      ],
      [
        'ignored job failure expression',
        (block: string) =>
          block.replace(
            '    name: Customizer Regressions',
            '    continue-on-error: ${{ true }}\n    name: Customizer Regressions',
          ),
      ],
      [
        'ignored step failure string',
        (block: string) =>
          block.replace(
            '        ' + CUSTOMIZER_GATE_COMMAND,
            "        continue-on-error: 'true'\n        " +
              CUSTOMIZER_GATE_COMMAND,
          ),
      ],
      [
        'ignored step failure expression',
        (block: string) =>
          block.replace(
            '        ' + CUSTOMIZER_GATE_COMMAND,
            '        continue-on-error: ${{ true }}\n        ' +
              CUSTOMIZER_GATE_COMMAND,
          ),
      ],
      [
        'disabled setup with misleading gate terms',
        (block: string) =>
          block.replace(
            "      - name: Setup Node + caches + install deps\n        if: needs.detect-changes.outputs.code == 'true' || needs.detect-changes.outputs.e2e == 'true'",
            "      - name: Setup Node + caches + install deps\n        if: false && (needs.detect-changes.outputs.code == 'true' || needs.detect-changes.outputs.e2e == 'true')",
          ),
      ],
      [
        'unnamed unguarded step',
        (block: string) =>
          block.replace(
            '    steps:',
            '    steps:\n      - run: echo unexpected',
          ),
      ],
      [
        'production hooks removed',
        (block: string) =>
          block.replace(
            "NEXT_PUBLIC_E2E_MODE: 'true'",
            "NEXT_PUBLIC_E2E_MODE: 'false'",
          ),
      ],
      [
        'development server substituted',
        (block: string) =>
          block.replace('node .next/standalone/server.js', 'node server.js'),
      ],
      [
        'invalid standalone hostname',
        (block: string) =>
          block.replace("HOSTNAME: '127.0.0.1'", "HOSTNAME: 'localhost'"),
      ],
      [
        'artifact upload replaced by echo',
        (block: string) =>
          block.replace(
            'uses: actions/upload-artifact@v7',
            'run: echo upload-artifact',
          ),
      ],
    ] as const)('rejects %s', (_label, mutate) => {
      const manifest = runWithWorkflow(
        mutateCustomizerJob(readWorkflow(), mutate),
      );
      expect(manifest.status).toBe('fail');
      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-condition-invalid',
          jobId: 'customizer-regressions',
        }),
      );
    });

    it('rejects the gate command when only an environment value mentions it', () => {
      const manifest = runWithWorkflow(
        mutateCustomizerJob(readWorkflow(), (block) =>
          block
            .replace(
              '        ' + CUSTOMIZER_GATE_COMMAND,
              '        run: echo missing',
            )
            .replace(
              "          HOSTNAME: '127.0.0.1'",
              "          HOSTNAME: '127.0.0.1'" +
                String.fromCharCode(10) +
                '          PREVIOUS_COMMAND: ' +
                JSON.stringify(CUSTOMIZER_GATE_COMMAND),
            ),
        ),
      );
      expect(manifest.status).toBe('fail');
      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          jobId: 'customizer-regressions',
        }),
      );
      expect(
        manifest.errors.some((error) => error.code === 'workflow-yaml-invalid'),
      ).toBe(false);
    });

    it('rejects a customizer gate that allows Playwright retries', () => {
      const retrying = mutateCustomizerJob(readWorkflow(), (block) =>
        block.replace(' --retries=0', ''),
      );

      const manifest = runWithWorkflow(retrying);

      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          jobId: 'customizer-regressions',
          missing: [CUSTOMIZER_GATE_COMMAND],
        }),
      );
    });

    it('rejects a customizer gate that keeps the retry-only trace mode', () => {
      // `--retries=0` plus the config default `trace: 'on-first-retry'`
      // records nothing, so a failure would ship no trace.
      const untraced = mutateCustomizerJob(readWorkflow(), (block) =>
        block.replace(' --trace=retain-on-failure', ' --trace=on-first-retry'),
      );

      const manifest = runWithWorkflow(untraced);

      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          jobId: 'customizer-regressions',
          missing: [CUSTOMIZER_GATE_COMMAND],
        }),
      );
    });

    it('rejects a customizer gate that drops one of the three spec packs', () => {
      const halved = mutateCustomizerJob(readWorkflow(), (block) =>
        block.replace(' e2e/customizer-equipment-catalog.spec.ts', ''),
      );

      const manifest = runWithWorkflow(halved);

      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          jobId: 'customizer-regressions',
          missing: [CUSTOMIZER_GATE_COMMAND],
        }),
      );
    });

    it('rejects a customizer gate whose own checkout does not fetch record-sheet assets', () => {
      const unfetched = mutateCustomizerJob(readWorkflow(), (block) =>
        block.replace("\n          fetch-assets: 'true'", ''),
      );

      // Other jobs still fetch assets; the gate's own checkout does not.
      expect(unfetched).toContain("fetch-assets: 'true'");

      const manifest = runWithWorkflow(unfetched);

      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-token-missing',
          jobId: 'customizer-regressions',
          missing: ["fetch-assets: 'true'"],
        }),
      );
    });

    it('rejects a customizer gate without the strict record-sheet asset check', () => {
      const unchecked = mutateCustomizerJob(readWorkflow(), (block) =>
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
          jobId: 'customizer-regressions',
          missing: ['run: npm run validate:assets:strict'],
        }),
      );
    });

    it('rejects a deleted customizer-regressions job', () => {
      const workflow = readWorkflow();
      const start = workflow.indexOf('\n  customizer-regressions:\n');
      const end = workflow.indexOf('\n  desktop-typecheck:\n', start);
      const deleted = workflow.slice(0, start) + workflow.slice(end);

      const manifest = runWithWorkflow(deleted);

      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'workflow-job-missing',
          id: 'customizer-regressions-gate',
          jobId: 'customizer-regressions',
        }),
      );
    });

    it('rejects an aggregator that stops requiring the customizer gate', () => {
      const unwired = readWorkflow().replace(
        '        customizer-regressions,\n',
        '',
      );

      // The job still exists — it just no longer blocks "Lint and Test".
      expect(unwired).toContain('\n  customizer-regressions:\n');

      const manifest = runWithWorkflow(unwired);

      expect(manifest.aggregatorNeeds.actual).not.toContain(
        'customizer-regressions',
      );
      expect(manifest.errors).toContainEqual(
        expect.objectContaining({
          code: 'aggregator-need-missing',
          jobId: 'customizer-regressions',
        }),
      );
    });
  });
});
