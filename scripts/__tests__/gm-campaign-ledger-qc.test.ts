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
      path.resolve(repoRoot, 'scripts/qc/validate-gm-campaign-ledger.mjs'),
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

describe('GM campaign ledger QC validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-gm-campaign-ledger-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current post-combat/base-economy GM ledger manifest', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('surfaces=1/1');
    expect(result.stdout).toContain('domains=4/4');
    expect(result.stdout).toContain('families=5/5');
    expect(result.stdout).toContain('errors=0');
  });

  it('emits automation-friendly JSON for the campaign ledger manifest', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      requiredDomains: string[];
      requiredFamilies: string[];
      anchors: unknown[];
      surface: { surfaceId: string; parentId: string };
    };
    expect(manifest.status).toBe('pass');
    expect(manifest.requiredDomains).toEqual([
      'post-combat',
      'economy',
      'repair',
      'salvage',
    ]);
    expect(manifest.requiredFamilies).toEqual([
      'salvage-allocation',
      'repair-ticket',
      'funds-transaction',
      'inventory-lot',
      'base-unit-state',
    ]);
    expect(manifest.anchors).toHaveLength(14);
    expect(manifest.surface).toMatchObject({
      surfaceId: 'post-combat-base-economy-gm-ledger',
      parentId: 'campaign-economy-progression',
    });
  });

  it('rejects stale active OpenSpec refs on the campaign ledger surface', () => {
    const registry = readJson<{
      surfaces: Array<{
        surfaceId: string;
        activeChangeRefs: string[];
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const surface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'post-combat-base-economy-gm-ledger',
    );
    expect(surface).toBeDefined();
    surface!.activeChangeRefs = ['missing-wave-08-ledger-change'];

    const registryPath = path.join(tempDir, 'qc-registry.json');
    writeJson(registryPath, registry);

    const result = runValidator([], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
      MEKSTATION_OPENSPEC_CHANGES_DIR: tempDir,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('missing-wave-08-ledger-change');
    expect(result.stdout).toContain('stale');
  });

  it('rejects missing campaign ledger source anchor tokens', () => {
    const anchorsPath = path.join(tempDir, 'anchors.json');
    writeJson(anchorsPath, [
      {
        id: 'broken-campaign-ledger-anchor',
        path: 'package.json',
        tokens: ['definitely-not-a-real-campaign-ledger-token'],
      },
    ]);

    const result = runValidator([], {
      MEKSTATION_GM_CAMPAIGN_LEDGER_ANCHORS_PATH: anchorsPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('broken-campaign-ledger-anchor');
    expect(result.stdout).toContain(
      'definitely-not-a-real-campaign-ledger-token',
    );
  });

  it('rejects a missing campaign ledger QC surface', () => {
    const registry = readJson<{
      surfaces: Array<{ surfaceId: string }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    registry.surfaces = registry.surfaces.filter(
      (entry) => entry.surfaceId !== 'post-combat-base-economy-gm-ledger',
    );

    const registryPath = path.join(tempDir, 'qc-registry.json');
    writeJson(registryPath, registry);

    const result = runValidator([], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Required GM campaign ledger surface post-combat-base-economy-gm-ledger is missing.',
    );
  });
});
