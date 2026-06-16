import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/validate-bv.ts');
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runValidateBv(args: string[]) {
  return spawnSync(NPX, ['tsx', SCRIPT_PATH, ...args], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });
}

function writeReferenceCache(referenceDir: string, entries: object): void {
  fs.mkdirSync(referenceDir, { recursive: true });
  fs.writeFileSync(
    path.join(referenceDir, 'megamek-bv-cache.json'),
    JSON.stringify({ entries }),
  );
}

describe('validate-bv fail-loud exits', () => {
  jest.setTimeout(60_000);

  it('exits distinctly when the committed reference dataset is missing', () => {
    const referenceDir = makeTempDir('validate-bv-empty-ref-');
    const outputDir = makeTempDir('validate-bv-empty-out-');

    const result = runValidateBv([
      '--reference-dir',
      referenceDir,
      '--output',
      outputDir,
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('BV reference dataset is missing or empty');
    expect(result.stdout).not.toContain('Processing:');
  });

  it('exits distinctly when resolved coverage is below the committed floor', () => {
    const referenceDir = makeTempDir('validate-bv-floor-ref-');
    const outputDir = makeTempDir('validate-bv-floor-out-');
    writeReferenceCache(referenceDir, {
      'atlas-as7-d': { megamekBV: 1 },
    });

    const result = runValidateBv([
      '--reference-dir',
      referenceDir,
      '--output',
      outputDir,
      '--filter',
      'Atlas',
      '--min-coverage',
      '6',
    ]);

    expect(result.status).toBe(3);
    expect(result.stdout).toContain('Coverage floor: 5/6');
    expect(result.stderr).toContain(
      'BV validation coverage below minimum floor',
    );
  });

  it('exits distinctly when coverage passes but an accuracy gate fails', () => {
    const referenceDir = makeTempDir('validate-bv-gate-ref-');
    const outputDir = makeTempDir('validate-bv-gate-out-');
    writeReferenceCache(referenceDir, {
      'atlas-as7-d': { megamekBV: 1 },
    });

    const result = runValidateBv([
      '--reference-dir',
      referenceDir,
      '--output',
      outputDir,
      '--filter',
      'Atlas',
      '--min-coverage',
      '1',
    ]);

    expect(result.status).toBe(4);
    expect(result.stdout).toContain('Coverage floor: 5/1');
    expect(result.stderr).toContain('BV validation accuracy gate failed');
  });
});
