import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runValidator(env: NodeJS.ProcessEnv = {}) {
  return spawnSync(
    NODE,
    [path.resolve(repoRoot, 'scripts/qc/validate-qc-registry.mjs')],
    {
      cwd: repoRoot,
      encoding: 'utf-8',
      env: { ...process.env, ...env },
    },
  );
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

describe('QC registry validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-qc-registry-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('rejects activeChangeRefs that only resolve to archived OpenSpec changes', () => {
    const registry = readJson<{
      surfaces: Array<{ surfaceId: string; activeChangeRefs: string[] }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const surface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'app-shell-navigation',
    );
    expect(surface).toBeDefined();
    surface!.activeChangeRefs = ['retired-change'];

    const registryPath = path.join(tempDir, 'registry.json');
    const archivePath = path.join(
      tempDir,
      'openspec',
      'changes',
      'archive',
      '2026-06-23-retired-change',
    );
    fs.mkdirSync(archivePath, { recursive: true });
    writeJson(registryPath, registry);

    const result = runValidator({
      MEKSTATION_OPENSPEC_CHANGES_DIR: path.join(
        tempDir,
        'openspec',
        'changes',
      ),
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'activeChangeRefs[0] does not resolve to an active OpenSpec change: retired-change',
    );
    expect(result.stdout).toContain('2026-06-23-retired-change');
  });

  it('rejects registry routes that no longer resolve to Next pages', () => {
    const registry = readJson<{
      surfaces: Array<{ surfaceId: string; routes: string[] }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const surface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'app-shell-navigation',
    );
    expect(surface).toBeDefined();
    surface!.routes = ['/replays'];

    const registryPath = path.join(tempDir, 'registry.json');
    writeJson(registryPath, registry);

    const result = runValidator({
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'app-shell-navigation: routes[0] does not resolve to a Next.js page route: /replays',
    );
  });

  it('rejects app-shell registry routes missing from browser proof manifest', () => {
    const registry = readJson<{
      surfaces: Array<{ surfaceId: string; routes: string[] }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const manifest = readJson<{
      primaryRoutes: Array<{ path: string; label: string }>;
    }>(path.join(repoRoot, 'e2e/app-shell-route-manifest.json'));

    manifest.primaryRoutes = manifest.primaryRoutes.filter(
      (route) => route.path !== '/settings',
    );

    const registryPath = path.join(tempDir, 'registry.json');
    const manifestPath = path.join(tempDir, 'app-shell-route-manifest.json');
    writeJson(registryPath, registry);
    writeJson(manifestPath, manifest);

    const result = runValidator({
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
      MEKSTATION_APP_SHELL_ROUTE_MANIFEST_PATH: manifestPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'app-shell-navigation routes missing from e2e/app-shell-route-manifest.json: /settings',
    );
  });

  it('rejects app-shell browser proof routes missing from the registry', () => {
    const registry = readJson<{
      surfaces: Array<{ surfaceId: string; routes: string[] }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const surface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'app-shell-navigation',
    );
    expect(surface).toBeDefined();
    surface!.routes = surface!.routes.filter((route) => route !== '/settings');

    const registryPath = path.join(tempDir, 'registry.json');
    writeJson(registryPath, registry);

    const result = runValidator({
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'e2e/app-shell-route-manifest.json routes missing from app-shell-navigation registry: /settings',
    );
  });
});
