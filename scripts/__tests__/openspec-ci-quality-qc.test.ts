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
    expect(result.stdout).toContain('activeOpenSpecChanges=0');
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
    };

    expect(manifest.status).toBe('pass');
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
});
