import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const AEROSPACE_SCRIPT = path.resolve(
  process.cwd(),
  'scripts/validate-aerospace-bv.ts',
);
const INFANTRY_SCRIPT = path.resolve(
  process.cwd(),
  'scripts/validate-infantry-bv.ts',
);

interface AerospaceReport {
  readonly generatedAt: string;
  readonly omittedUnreferencedUnits: number;
  readonly stats: {
    readonly total: number;
    readonly compared: number;
  };
  readonly units: readonly { readonly canonicalBV: number | null }[];
}

interface InfantryReport {
  readonly generatedAt: string;
  readonly totalPlatoons: number;
  readonly omittedWithoutMulBV: number;
  readonly parityCoverage: {
    readonly withMulBV: number;
  };
  readonly platoons: readonly { readonly mulBV: number | null }[];
}

function makeTempDir(prefix = 'wave4-bv-report-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeTempFile(name: string): string {
  const dir = makeTempDir();
  return path.join(dir, name);
}

function runScript(
  scriptPath: string,
  outputPath: string,
  extraArgs: readonly string[] = [],
) {
  return spawnSync(
    NPX,
    ['tsx', scriptPath, ...extraArgs, '--output', outputPath],
    {
      cwd: process.cwd(),
      encoding: 'utf-8',
      shell: process.platform === 'win32',
    },
  );
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function readJson<T>(outputPath: string): T {
  return JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as T;
}

describe('Wave 4 BV report output', () => {
  jest.setTimeout(90_000);

  it('keeps aerospace reports compact while retaining coverage counts', () => {
    const outputPath = makeTempFile('aerospace-report.json');
    const cacheDir = makeTempDir('wave4-aero-cache-');
    writeJson(path.join(cacheDir, 'referenced-aero.json'), {
      bv: 42,
      id: 'referenced-aero',
      name: 'Referenced Aero',
    });
    writeJson(path.join(cacheDir, 'unreferenced-aero.json'), {
      id: 'unreferenced-aero',
      name: 'Unreferenced Aero',
    });

    const result = runScript(AEROSPACE_SCRIPT, outputPath, [
      '--aero-cache',
      cacheDir,
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');

    const report = readJson<AerospaceReport>(outputPath);
    expect(report.generatedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(report.stats.total).toBe(2);
    expect(report.stats.compared).toBe(1);
    expect(report.omittedUnreferencedUnits).toBe(1);
    expect(report.units).toHaveLength(report.stats.compared);
    expect(report.omittedUnreferencedUnits + report.units.length).toBe(
      report.stats.total,
    );
    expect(report.units[0]?.canonicalBV).toBe(42);
    expect(
      report.units.every((unit) => {
        return unit.canonicalBV !== null;
      }),
    ).toBe(true);
  });

  it('keeps infantry reports compact while retaining platoon counts', () => {
    const outputPath = makeTempFile('infantry-report.json');
    const result = runScript(INFANTRY_SCRIPT, outputPath);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');

    const report = readJson<InfantryReport>(outputPath);
    expect(report.generatedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(report.totalPlatoons).toBeGreaterThan(0);
    expect(report.platoons).toHaveLength(report.parityCoverage.withMulBV);
    expect(report.omittedWithoutMulBV + report.platoons.length).toBe(
      report.totalPlatoons,
    );
    expect(
      report.platoons.every((platoon) => {
        return platoon.mulBV !== null;
      }),
    ).toBe(true);
  });
});
