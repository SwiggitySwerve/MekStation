import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function runValidator(ledgerPath: string, scanJsonPath: string) {
  return spawnSync(
    NODE,
    [
      path.resolve(
        repoRoot,
        'scripts/qc/validate-maintenance-warning-ledger.mjs',
      ),
      `--ledger=${ledgerPath}`,
      `--scan-json=${scanJsonPath}`,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf-8',
      env: process.env,
    },
  );
}

describe('maintenance warning ledger validator', () => {
  let tempDir: string;
  let scanJsonPath: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-maintenance-ledger-');
    scanJsonPath = path.join(tempDir, 'scan.json');
    writeJson(scanJsonPath, {
      findings: [
        {
          category: 'file-bloat',
          severity: 'warn',
          file: 'scripts/run-simulation.ts',
          line: 1,
          message: '662 LOC exceeds standard threshold',
        },
        {
          category: 'near-duplicate',
          severity: 'info',
          file: 'src/components/gameplay/HexMapDisplay/HexCell.tsx',
          line: 1,
          message: '8-line block cluster appears in 2 files',
        },
      ],
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('passes when actionable Wave 12 findings are tracked', () => {
    const ledgerPath = path.join(tempDir, 'ledger.json');
    writeJson(ledgerPath, {
      version: 1,
      categories: [
        'stale-todo',
        'file-bloat',
        'near-duplicate',
        'import-health',
        'design-violation',
      ],
      entries: [
        {
          key: 'file-bloat|warn|scripts/run-simulation.ts|662 LOC exceeds standard threshold',
          category: 'file-bloat',
          severity: 'warn',
          file: 'scripts/run-simulation.ts',
          message: '662 LOC exceeds standard threshold',
          status: 'follow-up',
          rationale:
            'Large simulation harness remains tracked for a future script split.',
          followUps: ['wave-12-script-bloat-follow-up'],
        },
      ],
    });

    const result = runValidator(ledgerPath, scanJsonPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[maintenance-ledger] tracked=1');
    expect(result.stderr).toBe('');
  });

  it('fails when an actionable Wave 12 finding is untracked', () => {
    const ledgerPath = path.join(tempDir, 'empty-ledger.json');
    writeJson(ledgerPath, {
      version: 1,
      categories: [
        'stale-todo',
        'file-bloat',
        'near-duplicate',
        'import-health',
        'design-violation',
      ],
      entries: [],
    });

    const result = runValidator(ledgerPath, scanJsonPath);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'untracked actionable finding: file-bloat warn scripts/run-simulation.ts',
    );
  });
});
