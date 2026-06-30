import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;
const scannerPath = path.resolve(
  repoRoot,
  'scripts/maintenance/scan-maintenance.mjs',
);

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function runScanner(scope: string) {
  return spawnSync(
    NODE,
    [scannerPath, '--json', '--category=design-violation', `--scope=${scope}`],
    {
      cwd: repoRoot,
      encoding: 'utf-8',
      env: process.env,
    },
  );
}

describe('maintenance scanner', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-maintenance-scanner-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('does not classify service facades as broad value objects', () => {
    writeFile(
      path.join(tempDir, 'services/local/DemoService.ts'),
      `
        import { EventEmitter } from 'events';

        interface IService {
          initialize(): Promise<void>;
          cleanup(): Promise<void>;
        }

        export class DemoService extends EventEmitter implements IService {
          private readonly dependency: { save(): void };

          constructor(dependency: { save(): void }) {
            super();
            this.dependency = dependency;
          }

          async initialize(): Promise<void> {}
          async cleanup(): Promise<void> {}
          list(): string[] { return []; }
          get(): string | null { return null; }
          set(): void { this.dependency.save(); }
          remove(): void {}
          clear(): void {}
          stats(): { count: number } { return { count: 0 }; }
        }
      `,
    );
    writeFile(
      path.join(tempDir, 'domain/NoisyValue.ts'),
      `
        export class NoisyValue {
          private readonly amount: number;

          constructor(amount: number) {
            this.amount = amount;
          }

          balance(): number { return this.amount; }
          credit(): number { return this.amount; }
          debit(): number { return this.amount; }
          freeze(): number { return this.amount; }
          release(): number { return this.amount; }
          settle(): number { return this.amount; }
          post(): number { return this.amount; }
          reconcile(): number { return this.amount; }
        }
      `,
    );

    const result = runScanner(tempDir);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');

    const payload = JSON.parse(result.stdout);
    const findings = payload.findings.map(
      (finding: { file: string; message: string }) =>
        `${finding.file}|${finding.message}`,
    );
    expect(
      findings.some((finding: string) => finding.includes('DemoService')),
    ).toBe(false);
    expect(
      findings.some((finding: string) =>
        finding.includes(
          'NoisyValue.ts|value object class has 8 public methods',
        ),
      ),
    ).toBe(true);
  });
});
