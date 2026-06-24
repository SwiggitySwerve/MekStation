import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;
const validatorPath = path.resolve(
  repoRoot,
  'scripts/qc/validate-wave4-scope-recovery.mjs',
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

describe('Wave 4 scope and recovery QC validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-wave4-qc-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current Wave 4 customizer/scope/recovery checkpoint', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('surfaces=5/5');
    expect(result.stdout).toContain('packageScripts=6/6');
    expect(result.stdout).toContain('errors=0');
    expect(result.stderr).toBe('');
  });

  it('emits automation-friendly JSON for the Wave 4 checkpoint', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      packageScripts: unknown[];
      surfaces: unknown[];
      anchors: unknown[];
      sourceAnchorCount: number;
    };
    expect(manifest.status).toBe('pass');
    expect(manifest.packageScripts).toHaveLength(6);
    expect(manifest.surfaces).toHaveLength(5);
    expect(manifest.anchors).toHaveLength(manifest.sourceAnchorCount);
    expect(manifest.sourceAnchorCount).toBeGreaterThanOrEqual(10);
  });

  it('rejects a missing Wave 4 aggregate script', () => {
    const packageJson = readJson<{ scripts: Record<string, string> }>(
      path.join(repoRoot, 'package.json'),
    );
    delete packageJson.scripts['verify:qc:wave4'];
    const packageJsonPath = path.join(tempDir, 'package.json');
    writeJson(packageJsonPath, packageJson);

    const result = runValidator([], {
      MEKSTATION_PACKAGE_JSON_PATH: packageJsonPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('verify:qc:wave4');
    expect(result.stdout).toContain('missing');
  });

  it('rejects missing non-BattleMech scope accounting', () => {
    const packageJson = readJson<{ scripts: Record<string, string> }>(
      path.join(repoRoot, 'package.json'),
    );
    packageJson.scripts['verify:qc:wave4:nonbattlemech-scope'] =
      'npm run validate:combat';
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
        token: '--expect-total=147',
      }),
    );
  });

  it('keeps multiplayer manual release boundaries visible', () => {
    const registry = readJson<{
      surfaces: Array<{
        surfaceId: string;
        gaps?: string[];
        manualChecks?: string[];
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const multiplayerSurface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'multiplayer-coop-sync',
    );
    expect(multiplayerSurface).toBeDefined();
    multiplayerSurface!.gaps = [];
    multiplayerSurface!.manualChecks = [];

    const registryPath = path.join(tempDir, 'registry.json');
    writeJson(registryPath, registry);

    const result = runValidator(['--json'], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ code: string; surfaceId?: string }>;
    };
    expect(manifest.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'surface-manual-boundary-missing',
          surfaceId: 'multiplayer-coop-sync',
        }),
        expect.objectContaining({
          code: 'surface-gap-honesty-missing',
          surfaceId: 'multiplayer-coop-sync',
        }),
      ]),
    );
  });
});
