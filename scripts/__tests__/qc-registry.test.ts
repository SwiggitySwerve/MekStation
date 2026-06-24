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
});
