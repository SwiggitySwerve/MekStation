import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runParityValidator(args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(
    NODE,
    [
      path.resolve(
        repoRoot,
        'scripts/qc/validate-tactical-projection-parity.mjs',
      ),
      ...args,
    ],
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

describe('tactical projection parity validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-tactical-parity-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current tactical projection parity manifest', () => {
    const result = runParityValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('surfaces=6/6');
    expect(result.stdout).toContain('anchors=8');
    expect(result.stdout).toContain('errors=0');
  });

  it('emits automation-friendly JSON for the tactical parity manifest', () => {
    const result = runParityValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      surfaces: unknown[];
      anchors: unknown[];
      browserCommandCount: number;
    };
    expect(manifest.status).toBe('pass');
    expect(manifest.surfaces).toHaveLength(6);
    expect(manifest.anchors).toHaveLength(8);
    expect(manifest.browserCommandCount).toBeGreaterThan(0);
  });

  it('rejects stale active OpenSpec refs on required tactical surfaces', () => {
    const registry = readJson<{
      surfaces: Array<{
        surfaceId: string;
        activeChangeRefs: string[];
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const surface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'movement-preview-engine-agreement',
    );
    expect(surface).toBeDefined();
    surface!.activeChangeRefs = ['missing-tactical-change'];

    const registryPath = path.join(tempDir, 'qc-registry.json');
    writeJson(registryPath, registry);

    const result = runParityValidator([], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
      MEKSTATION_OPENSPEC_CHANGES_DIR: tempDir,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('missing-tactical-change');
    expect(result.stdout).toContain('stale');
  });

  it('rejects missing tactical source anchor tokens', () => {
    const anchorsPath = path.join(tempDir, 'anchors.json');
    writeJson(anchorsPath, [
      {
        id: 'broken-anchor',
        path: 'package.json',
        tokens: ['definitely-not-a-real-tactical-anchor-token'],
      },
    ]);

    const result = runParityValidator([], {
      MEKSTATION_TACTICAL_PROJECTION_ANCHORS_PATH: anchorsPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('broken-anchor');
    expect(result.stdout).toContain(
      'definitely-not-a-real-tactical-anchor-token',
    );
  });
});
