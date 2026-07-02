import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const validatorPath = path.resolve(
  repoRoot,
  'scripts/qc/validate-nonbattlemech-scope-matrix.ts',
);
const matrixPath = path.resolve(
  repoRoot,
  'docs/qc/non-battlemech-combat-scope-matrix.json',
);

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function runValidator(args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(NPX, ['tsx', validatorPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
}

describe('non-BattleMech scope matrix QC validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-nonbattlemech-scope-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current per-family non-BattleMech combat scope matrix', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('families=6/6');
    expect(result.stdout).toContain('rows=148');
    expect(result.stdout).toContain('covered=148');
    expect(result.stdout).toContain('errors=0');
    expect(result.stderr).toBe('');
  });

  it('emits automation-friendly JSON for scope routing', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      releaseClaim: string;
      familyCount: number;
      rows: { total: number; leaf: number; aggregate: number };
      rowCoverage: { uncoveredRows: string[]; bucketCount: number };
      familySummaries: Array<{ familyId: string }>;
    };
    expect(manifest.status).toBe('pass');
    expect(manifest.releaseClaim).toBe('ready-with-scope');
    expect(manifest.familyCount).toBe(6);
    expect(manifest.rows).toMatchObject({
      total: 148,
      leaf: 145,
      aggregate: 3,
    });
    expect(manifest.rowCoverage.uncoveredRows).toEqual([]);
    expect(manifest.rowCoverage.bucketCount).toBeGreaterThanOrEqual(8);
    expect(manifest.familySummaries.map((entry) => entry.familyId)).toEqual(
      expect.arrayContaining([
        'ground-vehicles',
        'vtol',
        'aerospace-capital-lam',
        'battle-armor',
        'infantry',
        'protomech',
      ]),
    );
  });

  it('rejects matrices that remove a required family', () => {
    const matrix = readJson<{
      families: Array<{ familyId: string }>;
    }>(matrixPath);
    matrix.families = matrix.families.filter(
      (family) => family.familyId !== 'protomech',
    );
    const tempMatrixPath = path.join(tempDir, 'matrix.json');
    writeJson(tempMatrixPath, matrix);

    const result = runValidator(['--json'], {
      MEKSTATION_NONBATTLEMECH_SCOPE_MATRIX_PATH: tempMatrixPath,
    });

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ code: string; message: string }>;
    };
    expect(manifest.errors).toContainEqual(
      expect.objectContaining({
        code: 'required-family-missing',
        message: expect.stringContaining('protomech'),
      }),
    );
  });

  it('rejects stale out-of-scope totals', () => {
    const matrix = readJson<{
      expectedOutOfScopeSummary: { total: number };
    }>(matrixPath);
    matrix.expectedOutOfScopeSummary.total = 146;
    const tempMatrixPath = path.join(tempDir, 'matrix.json');
    writeJson(tempMatrixPath, matrix);

    const result = runValidator(['--json'], {
      MEKSTATION_NONBATTLEMECH_SCOPE_MATRIX_PATH: tempMatrixPath,
    });

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ code: string; details?: { expected?: number } }>;
    };
    expect(manifest.errors).toContainEqual(
      expect.objectContaining({
        code: 'out-of-scope-total-mismatch',
        details: expect.objectContaining({ expected: 146 }),
      }),
    );
  });

  it('rejects row coverage buckets that stop covering every out-of-scope row', () => {
    const matrix = readJson<{
      rowCoverageBuckets: Array<{ bucketId: string }>;
    }>(matrixPath);
    matrix.rowCoverageBuckets = matrix.rowCoverageBuckets.filter(
      (bucket) => bucket.bucketId !== 'product-control-plane',
    );
    const tempMatrixPath = path.join(tempDir, 'matrix.json');
    writeJson(tempMatrixPath, matrix);

    const result = runValidator(['--json'], {
      MEKSTATION_NONBATTLEMECH_SCOPE_MATRIX_PATH: tempMatrixPath,
    });

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      rowCoverage: { uncoveredRows: string[] };
      errors: Array<{ code: string; details?: { ref?: string } }>;
    };
    expect(manifest.rowCoverage.uncoveredRows).toEqual(
      expect.arrayContaining(['actions.gmCommandExclusions.gm.advance-phase']),
    );
    expect(manifest.errors).toContainEqual(
      expect.objectContaining({
        code: 'out-of-scope-row-uncovered',
        details: expect.objectContaining({
          ref: 'actions.gmCommandExclusions.gm.advance-phase',
        }),
      }),
    );
  });
});
