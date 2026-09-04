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
      path.resolve(repoRoot, 'scripts/qc/validate-gm-time-cascade-ledger.mjs'),
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

const SECTION_16_LANE_TOKENS = [
  'dayPipeline.test.ts',
  'GmCampaignRewindImpactPreview.test.ts',
  'GmCampaignAffectedFamilies.test.ts',
  'GmCampaignImpactDerivation.test.ts',
  'GmCampaignArtifactUseGuard.test.ts',
  'campaignCommandPipelineRebuild.test.ts',
  'campaignCommandPipelineArtifactUse.test.ts',
  'EventHistoryActivation.test.ts',
] as const;

type PackageJsonScripts = {
  scripts: Record<string, string>;
};

/** WHAT: Write a package.json whose time-cascade lane omits one required suite token.
 *  WHY: The 16.5 row must fail on a dropped lane suite, not on an unrelated script edit. */
function writeLaneWithoutToken(tempDir: string, token: string): string {
  const packageJson = readJson<PackageJsonScripts>(
    path.join(repoRoot, 'package.json'),
  );
  const lane = packageJson.scripts['verify:qc:gm:time-cascade'];
  expect(typeof lane).toBe('string');
  expect(lane).toContain(token);
  packageJson.scripts['verify:qc:gm:time-cascade'] = lane.split(token).join('');
  const packageJsonPath = path.join(tempDir, 'package.json');
  writeJson(packageJsonPath, packageJson);
  return packageJsonPath;
}

describe('GM time cascade QC validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-gm-time-cascade-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current GM time cascade ledger manifest', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('surfaces=1/1');
    expect(result.stdout).toContain('domains=1/1');
    expect(result.stdout).toContain('families=1/1');
    expect(result.stdout).toContain('processors=6/6');
    expect(result.stdout).toContain('roots=12/12');
    expect(result.stdout).toContain('errors=0');
  });

  it('emits automation-friendly JSON for the time cascade manifest', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      requiredDomains: string[];
      requiredFamilies: string[];
      requiredProcessors: string[];
      requiredCampaignRoots: string[];
      anchors: Array<{ id: string }>;
      surface: { surfaceId: string; parentId: string };
    };
    expect(manifest.status).toBe('pass');
    expect(manifest.requiredDomains).toEqual(['time']);
    expect(manifest.requiredFamilies).toEqual(['time-advance']);
    expect(manifest.requiredProcessors).toEqual([
      'repairProgressProcessor',
      'contractProcessor',
      'dailyCostsProcessor',
      'unitMarketProcessor',
      'personnelMarketProcessor',
      'contractMarketProcessor',
    ]);
    expect(manifest.requiredCampaignRoots).toContain('currentDate');
    expect(manifest.requiredCampaignRoots).toContain('contractMarket');
    expect(manifest.anchors).toHaveLength(17);
    expect(manifest.anchors.map((anchor) => anchor.id)).toEqual(
      expect.arrayContaining([
        'time-cascade-gm-ledger-actions',
        'time-cascade-roster-recovery-projection',
        'time-cascade-roster-recovery-tests',
      ]),
    );
    expect(manifest.surface).toMatchObject({
      surfaceId: 'time-cascade-gm-ledger',
      parentId: 'campaign-economy-progression',
    });
  });

  it('rejects stale active OpenSpec refs on the time cascade surface', () => {
    const registry = readJson<{
      surfaces: Array<{
        surfaceId: string;
        activeChangeRefs: string[];
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    const surface = registry.surfaces.find(
      (entry) => entry.surfaceId === 'time-cascade-gm-ledger',
    );
    expect(surface).toBeDefined();
    surface!.activeChangeRefs = ['missing-wave-09-time-cascade-change'];

    const registryPath = path.join(tempDir, 'qc-registry.json');
    writeJson(registryPath, registry);

    const result = runValidator([], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
      MEKSTATION_OPENSPEC_CHANGES_DIR: tempDir,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('missing-wave-09-time-cascade-change');
    expect(result.stdout).toContain('stale');
  });

  it('rejects missing time cascade source anchor tokens', () => {
    const anchorsPath = path.join(tempDir, 'anchors.json');
    writeJson(anchorsPath, [
      {
        id: 'broken-time-cascade-anchor',
        path: 'package.json',
        tokens: ['definitely-not-a-real-time-cascade-token'],
      },
    ]);

    const result = runValidator([], {
      MEKSTATION_GM_TIME_CASCADE_ANCHORS_PATH: anchorsPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('broken-time-cascade-anchor');
    expect(result.stdout).toContain('definitely-not-a-real-time-cascade-token');
  });

  it.each(SECTION_16_LANE_TOKENS)(
    'rejects the time-cascade lane when %s is dropped',
    (token) => {
      const packageJsonPath = writeLaneWithoutToken(tempDir, token);
      const result = runValidator([], {
        MEKSTATION_PACKAGE_JSON_PATH: packageJsonPath,
      });

      expect(result.status).toBe(1);
      expect(result.stdout).toContain(token);
      expect(result.stdout).toContain('must expose a command containing');
    },
  );

  it('rejects a missing time cascade QC surface', () => {
    const registry = readJson<{
      surfaces: Array<{ surfaceId: string }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-registry.json'));
    registry.surfaces = registry.surfaces.filter(
      (entry) => entry.surfaceId !== 'time-cascade-gm-ledger',
    );

    const registryPath = path.join(tempDir, 'qc-registry.json');
    writeJson(registryPath, registry);

    const result = runValidator([], {
      MEKSTATION_QC_REGISTRY_PATH: registryPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Required GM time cascade ledger surface time-cascade-gm-ledger is missing.',
    );
  });
});
