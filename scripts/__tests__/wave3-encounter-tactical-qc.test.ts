import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;
const validatorPath = path.resolve(
  repoRoot,
  'scripts/qc/validate-wave3-encounter-tactical.mjs',
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
  return spawnSync(NODE, [validatorPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
}

describe('Wave 3 encounter/tactical QC validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-wave3-qc-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current Wave 3 encounter/tactical checkpoint', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('surfaces=8/8');
    expect(result.stdout).toContain('packageScripts=5/5');
    expect(result.stdout).toContain('legacySmokeLeaks=0');
    expect(result.stdout).toContain('errors=0');
    expect(result.stderr).toBe('');
  });

  it('emits automation-friendly JSON for the Wave 3 checkpoint', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      packageScripts: unknown[];
      surfaces: unknown[];
      majorScenarioContracts: unknown[];
      anchors: unknown[];
      legacySmokeLeakCount: number;
    };
    expect(manifest.status).toBe('pass');
    expect(manifest.packageScripts).toHaveLength(5);
    expect(manifest.surfaces).toHaveLength(8);
    expect(manifest.majorScenarioContracts).toHaveLength(1);
    expect(manifest.anchors).toHaveLength(3);
    expect(manifest.legacySmokeLeakCount).toBe(0);
  });

  it('rejects missing Wave 3 package scripts', () => {
    const packageJson = readJson<{ scripts: Record<string, string> }>(
      path.join(repoRoot, 'package.json'),
    );
    delete packageJson.scripts['verify:qc:wave3'];
    const packageJsonPath = path.join(tempDir, 'package.json');
    writeJson(packageJsonPath, packageJson);

    const result = runValidator([], {
      MEKSTATION_PACKAGE_JSON_PATH: packageJsonPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('verify:qc:wave3');
    expect(result.stdout).toContain('missing');
  });

  it('rejects permissive encounter smoke as Wave 3 release proof', () => {
    const registry = readJson<{
      surfaces: Array<{
        surfaceId: string;
        tests?: string[];
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const forceSurface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'force-pilot-encounter-setup',
    );
    expect(forceSurface).toBeDefined();
    forceSurface!.tests = [
      ...(forceSurface!.tests ?? []),
      'e2e/encounter-flow.spec.ts',
    ];

    const registryPath = path.join(tempDir, 'registry.json');
    writeJson(registryPath, registry);

    const result = runValidator(['--json'], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ code: string }>;
    };
    expect(manifest.errors).toContainEqual(
      expect.objectContaining({ code: 'legacy-smoke-release-leak' }),
    );
    expect(result.stdout).toContain('e2e/encounter-flow.spec.ts');
  });

  it('rejects permissive encounter smoke in the major capability scenario', () => {
    const majorScenarios = readJson<{
      scenarios: Array<{
        id: string;
        checks?: Array<{
          command?: string;
          evidence?: string[];
        }>;
      }>;
    }>(
      path.join(repoRoot, 'docs/qc/mekstation-major-capability-scenarios.json'),
    );
    const forceScenario = majorScenarios.scenarios.find(
      (entry) => entry.id === 'MC-04-force-pilot-encounter-setup',
    );
    expect(forceScenario).toBeDefined();
    forceScenario!.checks = [
      ...(forceScenario!.checks ?? []),
      {
        command:
          'npx.cmd playwright test e2e/encounter-flow.spec.ts --project=chromium',
        evidence: ['e2e/encounter-flow.spec.ts'],
      },
    ];

    const majorScenariosPath = path.join(tempDir, 'major-scenarios.json');
    writeJson(majorScenariosPath, majorScenarios);

    const result = runValidator(['--json'], {
      MEKSTATION_MAJOR_SCENARIOS_PATH: majorScenariosPath,
    });

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ code: string }>;
    };
    expect(manifest.errors).toContainEqual(
      expect.objectContaining({ code: 'major-scenario-legacy-smoke-leak' }),
    );
    expect(result.stdout).toContain('e2e/encounter-flow.spec.ts');
  });
});
