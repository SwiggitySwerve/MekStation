import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runValidator(args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(
    NODE,
    [
      path.resolve(
        repoRoot,
        'scripts/qc/validate-combat-catalog-rules-parity.mjs',
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

describe('combat catalog rules parity QC validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-combat-catalog-qc-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current combat catalog parity manifest', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('surfaces=7/7');
    expect(result.stdout).toContain('anchors=9');
    expect(result.stdout).toContain('expectedOutOfScope=147');
    expect(result.stdout).toContain('staleRefs=0');
    expect(result.stdout).toContain('errors=0');
  });

  it('emits automation-friendly JSON for catalog/rules parity', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      requiredSurfaceCount: number;
      sourceAnchorCount: number;
      expectedOutOfScopeSummary: {
        total: number;
        sections: string[];
      };
      surfaces: Array<{ surfaceId: string }>;
    };
    expect(manifest.status).toBe('pass');
    expect(manifest.requiredSurfaceCount).toBe(7);
    expect(manifest.sourceAnchorCount).toBe(9);
    expect(manifest.expectedOutOfScopeSummary.total).toBe(147);
    expect(manifest.expectedOutOfScopeSummary.sections).toContain(
      '--expect-section=featureSupport:75',
    );
    expect(manifest.surfaces.map((surface) => surface.surfaceId)).toEqual(
      expect.arrayContaining([
        'simulation-combat-validation',
        'battlemech-combat-catalog-validation',
        'known-gap-honesty-audit',
      ]),
    );
  });

  it('rejects stale active OpenSpec refs on combat parity surfaces', () => {
    const registry = readJson<{
      surfaces: Array<{
        surfaceId: string;
        activeChangeRefs: string[];
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const surface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'battlemech-combat-catalog-validation',
    );
    expect(surface).toBeDefined();
    surface!.activeChangeRefs = ['missing-wave-10-catalog-change'];

    const registryPath = path.join(tempDir, 'qc-registry.json');
    writeJson(registryPath, registry);

    const result = runValidator([], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
      MEKSTATION_OPENSPEC_CHANGES_DIR: tempDir,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('missing-wave-10-catalog-change');
    expect(result.stdout).toContain('stale');
  });

  it('rejects stale out-of-scope count expectations', () => {
    const registry = readJson<{
      surfaces: Array<{
        surfaceId: string;
        commands: string[];
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const surface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'non-battlemech-combat-scope-matrix',
    );
    expect(surface).toBeDefined();
    surface!.commands = surface!.commands.map((command) =>
      command.replace(' --expect-total=147', ''),
    );

    const registryPath = path.join(tempDir, 'qc-registry.json');
    writeJson(registryPath, registry);

    const result = runValidator([], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('--expect-total=147');
  });

  it('rejects combat child surfaces that drift back to partial', () => {
    const registry = readJson<{
      surfaces: Array<{
        surfaceId: string;
        coverageStatus: string;
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const surface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'physical-weapon-runtime-boundary',
    );
    expect(surface).toBeDefined();
    surface!.coverageStatus = 'partial';

    const registryPath = path.join(tempDir, 'qc-registry.json');
    writeJson(registryPath, registry);

    const result = runValidator([], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'physical-weapon-runtime-boundary must keep coverageStatus in ready-with-scope.',
    );
  });

  it('rejects missing combat catalog source anchor tokens', () => {
    const anchorsPath = path.join(tempDir, 'anchors.json');
    writeJson(anchorsPath, [
      {
        id: 'broken-combat-catalog-anchor',
        path: 'package.json',
        tokens: ['definitely-not-a-real-combat-catalog-token'],
      },
    ]);

    const result = runValidator([], {
      MEKSTATION_COMBAT_CATALOG_ANCHORS_PATH: anchorsPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('broken-combat-catalog-anchor');
    expect(result.stdout).toContain(
      'definitely-not-a-real-combat-catalog-token',
    );
  });

  it('rejects a missing required combat parity surface', () => {
    const registry = readJson<{
      surfaces: Array<{ surfaceId: string }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    registry.surfaces = registry.surfaces.filter(
      (entry) => entry.surfaceId !== 'known-gap-honesty-audit',
    );

    const registryPath = path.join(tempDir, 'qc-registry.json');
    writeJson(registryPath, registry);

    const result = runValidator([], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Required combat catalog surface known-gap-honesty-audit is missing.',
    );
  });
});
