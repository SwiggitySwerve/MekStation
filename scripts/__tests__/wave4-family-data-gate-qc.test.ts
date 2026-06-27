import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;
const validatorPath = path.resolve(
  repoRoot,
  'scripts/qc/validate-wave4-family-data-gate.mjs',
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

describe('Wave 4 representative family data QC gate', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-wave4-family-data-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current representative family data checkpoint', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('families=6/6');
    expect(result.stdout).toContain('surfaces=2/2');
    expect(result.stdout).toContain('errors=0');
    expect(result.stderr).toBe('');
  });

  it('emits automation-friendly JSON for every supported representative family', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      familyCount: number;
      families: Array<{ familyId: string }>;
    };

    expect(manifest.status).toBe('pass');
    expect(manifest.familyCount).toBe(6);
    expect(manifest.families.map((family) => family.familyId).sort()).toEqual([
      'aerospace',
      'battle-armor',
      'battlemech',
      'infantry',
      'protomech',
      'vehicle-vtol',
    ]);
  });

  it('rejects a partial customizer surface before release signoff', () => {
    const registry = readJson<{
      surfaces: Array<{ surfaceId: string; coverageStatus: string }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const customizerSurface = registry.surfaces.find(
      (surface) => surface.surfaceId === 'customizer-construction-bv-export',
    );
    expect(customizerSurface).toBeDefined();
    customizerSurface!.coverageStatus = 'partial';

    const registryPath = path.join(tempDir, 'registry.json');
    writeJson(registryPath, registry);

    const result = runValidator(['--json'], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ code: string; surfaceId?: string }>;
    };
    expect(manifest.errors).toContainEqual(
      expect.objectContaining({
        code: 'surface-coverage-not-release-ready',
        surfaceId: 'customizer-construction-bv-export',
      }),
    );
  });

  it('rejects missing family-gate package wiring', () => {
    const packageJson = readJson<{ scripts: Record<string, string> }>(
      path.join(repoRoot, 'package.json'),
    );
    packageJson.scripts['verify:qc:wave4:customizer-data'] =
      packageJson.scripts['verify:qc:wave4:customizer-data'].replace(
        'npm run qc:wave4:family-data:validate && ',
        '',
      );

    const packageJsonPath = path.join(tempDir, 'package.json');
    writeJson(packageJsonPath, packageJson);

    const result = runValidator(['--json'], {
      MEKSTATION_PACKAGE_JSON_PATH: packageJsonPath,
    });

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ code: string; token?: string }>;
    };
    expect(manifest.errors).toContainEqual(
      expect.objectContaining({
        code: 'package-script-token-missing',
        token: 'qc:wave4:family-data:validate',
      }),
    );
  });
});
