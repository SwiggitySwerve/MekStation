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
      path.resolve(repoRoot, 'scripts/qc/validate-long-campaign-qc.mjs'),
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

describe('long campaign QC validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-long-campaign-qc-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current long-campaign QC manifest', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('surfaces=1/1');
    expect(result.stdout).toContain('packageScripts=5/5');
    expect(result.stdout).toContain('journey=1/1');
    expect(result.stdout).toContain('uiFlow=1/1');
    expect(result.stdout).toContain('errors=0');
  });

  it('emits automation-friendly JSON for long-campaign QC', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      journeyId: string;
      surface: { surfaceId: string; parentId: string; claimIds: string[] };
      packageScripts: Array<{ scriptId: string }>;
      journey: { contracts: { minimum: number; maximum: number } };
      uiFlow: { checkpointIds: string[]; qcCommand: string };
      graph: { requiredNodeCount: number; requiredEdgeCount: number };
    };
    expect(manifest.status).toBe('pass');
    expect(manifest.journeyId).toBe('campaign-long');
    expect(manifest.surface).toMatchObject({
      surfaceId: 'long-campaign-stability',
      parentId: 'campaign-economy-progression',
    });
    expect(manifest.surface.claimIds).toContain('campaign.long-stability');
    expect(manifest.packageScripts.map((entry) => entry.scriptId)).toEqual([
      'qc:campaign-long:validate',
      'qc:campaign-long:browser',
      'verify:qc:campaign-long',
      'verify:qc:campaign-journeys',
      'verify:qc',
    ]);
    expect(manifest.journey.contracts).toMatchObject({
      minimum: 6,
      maximum: 10,
    });
    expect(manifest.uiFlow.qcCommand).toContain('qc:campaign-long:stability');
    expect(manifest.uiFlow.checkpointIds).toEqual([
      'campaign-base',
      'starmap',
      'medical',
      'salvage',
      'repair',
      'finances',
      'campaign-log',
    ]);
    expect(manifest.graph).toEqual({
      requiredNodeCount: 6,
      requiredEdgeCount: 3,
    });
  });

  it('rejects missing global verify:qc wiring', () => {
    const packageJson = readJson<{
      scripts: Record<string, string>;
    }>(path.join(repoRoot, 'package.json'));
    packageJson.scripts['verify:qc'] = packageJson.scripts[
      'verify:qc'
    ]!.replace(' && npm run verify:qc:campaign-long', '');
    const packageJsonPath = path.join(tempDir, 'package.json');
    writeJson(packageJsonPath, packageJson);

    const result = runValidator([], {
      MEKSTATION_PACKAGE_JSON_PATH: packageJsonPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'verify:qc must include verify:qc:campaign-long',
    );
  });

  it('rejects missing first-class registry surface', () => {
    const registry = readJson<{
      surfaces: Array<{ surfaceId: string }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    registry.surfaces = registry.surfaces.filter(
      (entry) => entry.surfaceId !== 'long-campaign-stability',
    );
    const registryPath = path.join(tempDir, 'qc-registry.json');
    writeJson(registryPath, registry);

    const result = runValidator([], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Required long-campaign QC surface long-campaign-stability is missing.',
    );
  });

  it('rejects stale campaign OpenSpec active references', () => {
    const registry = readJson<{
      surfaces: Array<{
        surfaceId: string;
        activeChangeRefs: string[];
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const surface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'campaign-economy-progression',
    );
    expect(surface).toBeDefined();
    surface!.activeChangeRefs = ['missing-long-campaign-change'];
    const registryPath = path.join(tempDir, 'qc-registry.json');
    writeJson(registryPath, registry);

    const result = runValidator([], {
      MEKSTATION_OPENSPEC_CHANGES_DIR: tempDir,
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('missing-long-campaign-change');
    expect(result.stdout).toContain('stale or inactive OpenSpec change');
  });

  it('rejects a long-campaign catalog without the 10-contract maximum', () => {
    const catalog = readJson<{
      journeys: Array<{
        id: string;
        parameters: { contracts?: { maximum?: number } };
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-journey-scenarios.json'));
    const journey = catalog.journeys.find(
      (entry) => entry.id === 'campaign-long',
    );
    expect(journey).toBeDefined();
    delete journey!.parameters.contracts!.maximum;
    const catalogPath = path.join(tempDir, 'journeys.json');
    writeJson(catalogPath, catalog);

    const result = runValidator([], {
      MEKSTATION_JOURNEY_CATALOG_PATH: catalogPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'campaign-long contracts maximum must be 10',
    );
  });

  it('rejects missing source anchor tokens', () => {
    const anchorsPath = path.join(tempDir, 'anchors.json');
    writeJson(anchorsPath, [
      {
        id: 'broken-long-campaign-anchor',
        path: 'package.json',
        tokens: ['definitely-not-a-real-long-campaign-token'],
      },
    ]);

    const result = runValidator([], {
      MEKSTATION_CAMPAIGN_LONG_QC_ANCHORS_PATH: anchorsPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('broken-long-campaign-anchor');
    expect(result.stdout).toContain(
      'definitely-not-a-real-long-campaign-token',
    );
  });
});
