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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function runScript(
  scriptPath: string,
  args: string[] = [],
  env: NodeJS.ProcessEnv = {},
) {
  return spawnSync(NODE, [path.resolve(repoRoot, scriptPath), ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
}

function writeBrowserFixture(tempDir: string, hasBrowserScenario: boolean) {
  const registryPath = path.join(tempDir, 'registry.json');
  const scenariosPath = path.join(tempDir, 'scenarios.json');

  writeJson(registryPath, {
    version: 1,
    surfaces: [
      {
        surfaceId: 'customizer-construction-bv-export',
        parentId: null,
        routes: ['/gameplay/customize'],
        desktopSurfaces: [],
        qualityLenses: ['usability', 'rules-parity'],
        riskTags: ['user-workflow'],
        commands: ['npm.cmd run validate:bv'],
        tests: [],
        evidence: ['BattleMech BV validator passes.'],
      },
    ],
  });

  writeJson(scenariosPath, {
    version: 1,
    scenarios: [
      {
        id: 'MC-03-customizer-construction-bv-export',
        surfaceId: 'customizer-construction-bv-export',
        checks: [
          {
            id: hasBrowserScenario
              ? 'customizer-browser-flow'
              : 'battlemech-bv-validator',
            required: true,
            command: hasBrowserScenario
              ? 'npx.cmd playwright test e2e/customizer.spec.ts --project=chromium'
              : 'npm.cmd run validate:bv',
            evidence: hasBrowserScenario
              ? ['e2e/customizer.spec.ts']
              : ['scripts/validate-bv.ts'],
          },
        ],
      },
    ],
  });

  return {
    MEKSTATION_MAJOR_SCENARIOS_PATH: scenariosPath,
    MEKSTATION_QC_REGISTRY_PATH: registryPath,
  };
}

describe('QC automation coverage validators', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-qc-automation-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('passes current manual-check coverage with machine-backed proof', () => {
    const result = runScript('scripts/qc/validate-manual-automation-gaps.mjs', [
      '--json',
    ]);

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as {
      manualSurfaceCount: number;
      unbackedManualSurfaceCount: number;
    };
    expect(report.manualSurfaceCount).toBeGreaterThan(0);
    expect(report.unbackedManualSurfaceCount).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('rejects manual checks that have no command, current evidence, or proof token', () => {
    const registryPath = path.join(tempDir, 'registry.json');
    writeJson(registryPath, {
      version: 1,
      surfaces: [
        {
          surfaceId: 'manual-only-surface',
          commands: [],
          tests: [],
          manualChecks: ['Click through this route by hand.'],
          evidence: [],
        },
      ],
    });

    const result = runScript(
      'scripts/qc/validate-manual-automation-gaps.mjs',
      ['--json'],
      { MEKSTATION_QC_REGISTRY_PATH: registryPath },
    );
    const report = JSON.parse(result.stdout) as {
      unbackedManualSurfaceCount: number;
      surfaces: Array<{ blockers: string[] }>;
    };

    expect(result.status).toBe(1);
    expect(report.unbackedManualSurfaceCount).toBe(1);
    expect(report.surfaces[0]?.blockers).toEqual(
      expect.arrayContaining([
        'manual-checks-without-command',
        'manual-checks-without-current-evidence',
        'manual-checks-without-machine-proof-token',
      ]),
    );
    expect(result.stderr).toContain(
      'manual surfaces without machine-backed proof: 1',
    );
  });

  it('passes current browser-required surface coverage', () => {
    const result = runScript('scripts/qc/validate-surface-browser-proof.mjs', [
      '--json',
    ]);

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as {
      browserRequiredSurfaceCount: number;
      missingBrowserProofCount: number;
    };
    expect(report.browserRequiredSurfaceCount).toBeGreaterThan(0);
    expect(report.missingBrowserProofCount).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('accepts major scenario browser checks as resolved browser proof', () => {
    const env = writeBrowserFixture(tempDir, true);
    const result = runScript(
      'scripts/qc/validate-surface-browser-proof.mjs',
      ['--json'],
      env,
    );
    const report = JSON.parse(result.stdout) as {
      missingBrowserProofCount: number;
      surfaces: Array<{ proof?: { kind: string; checkId: string } }>;
    };

    expect(result.status).toBe(0);
    expect(report.missingBrowserProofCount).toBe(0);
    expect(report.surfaces[0]?.proof).toMatchObject({
      kind: 'major-scenario',
      checkId: 'customizer-browser-flow',
    });
  });

  it('rejects browser-risk surfaces without direct or resolved browser proof', () => {
    const env = writeBrowserFixture(tempDir, false);
    const result = runScript(
      'scripts/qc/validate-surface-browser-proof.mjs',
      ['--json'],
      env,
    );
    const report = JSON.parse(result.stdout) as {
      missingBrowserProofCount: number;
      surfaces: Array<{ status: string; proof: unknown }>;
    };

    expect(result.status).toBe(1);
    expect(report.missingBrowserProofCount).toBe(1);
    expect(report.surfaces[0]).toMatchObject({
      status: 'missing-browser-proof',
      proof: null,
    });
    expect(result.stderr).toContain(
      'browser-required surfaces without resolved browser proof: 1',
    );
  });
});
