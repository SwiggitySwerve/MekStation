import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;
const validatorPath = path.resolve(
  repoRoot,
  'scripts/qc/validate-app-completion-gate.mjs',
);

const requiredSurfaceIds = [
  'app-shell-navigation',
  'campaign-economy-progression',
  'long-campaign-stability',
  'post-combat-base-economy-gm-ledger',
  'time-cascade-gm-ledger',
  'force-pilot-encounter-setup',
  'gameplay-tactical-map-combat',
  'simulation-combat-validation',
  'battlemech-combat-catalog-validation',
  'non-battlemech-combat-scope-matrix',
  'customizer-construction-bv-export',
  'multiplayer-coop-sync',
  'replay-audit-history',
  'desktop-api-security',
  'maintenance-code-health',
  'openspec-ci-quality',
];

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFixtureSet(tempDir: string, hasReleaseGap: boolean) {
  const packageJsonPath = path.join(tempDir, 'package.json');
  const registryPath = path.join(tempDir, 'registry.json');
  const majorPath = path.join(tempDir, 'major.json');
  const journeysPath = path.join(tempDir, 'journeys.json');
  const loggingPath = path.join(tempDir, 'logging.json');
  const maintenancePath = path.join(tempDir, 'maintenance.json');
  const openspecChangesPath = path.join(tempDir, 'openspec', 'changes');

  writeJson(packageJsonPath, {
    scripts: {
      'qc:app-completion': 'node scripts/qc/validate-app-completion-gate.mjs',
      'qc:app-completion:release':
        'node scripts/qc/validate-app-completion-gate.mjs --fail-on-release-gaps',
      'qc:validate': 'node scripts/qc/validate-qc-registry.mjs',
      'qc:lifecycle:status': 'node scripts/qc/report-lifecycle-qc-status.mjs',
      'qc:logging:validate':
        'node scripts/qc/validate-journey-qc.mjs --logging-only=true',
      'verify:app-completion':
        'npm run qc:app-completion && npm run verify:qc && npm run verify:rules && npm run electron:test:build',
      'verify:app-completion:release':
        'npm run qc:app-completion:release && npm run verify:app-completion',
      'verify:qc': 'npm run qc:lifecycle:status',
      'verify:rules':
        'npm run validate:combat:gaps -- --format=summary --expect-total=0 && npm run validate:combat:gaps -- --level=out-of-scope --format=summary --expect-total=147 && npx openspec validate --all --strict',
      'electron:test:build': 'cd desktop && npm run test:build',
      'validate:combat:gaps': 'npx tsx scripts/print-combat-validation-gaps.ts',
      'verify:qc:app-shell':
        'npx playwright test --project=chromium e2e/app-shell-route-proof.spec.ts',
      'verify:qc:campaign-economy':
        'npm run verify:qc:campaign-economy:browser',
      'qc:campaign-long:browser':
        'npx playwright test e2e/campaign-long-browser-signoff.spec.ts',
      'verify:qc:campaign-long':
        'npm run qc:campaign-long:stability && npm run qc:campaign-long:browser',
      'verify:qc:gm:campaign-ledger': 'npm run qc:gm:campaign-ledger:validate',
      'verify:qc:gm:time-cascade': 'npm run qc:gm:time-cascade:validate',
      'qc:wave3:validate':
        'node scripts/qc/validate-wave3-encounter-tactical.mjs',
      'verify:qc:wave3': 'npm run qc:wave3:validate',
      'verify:qc:multiplayer-reliability':
        'npm run verify:qc:multiplayer:browser',
      'verify:qc:journeys': 'npm run qc:journeys',
      'verify:qc:ui-flow-shell': 'npm run qc:ui-flow-shell',
      'verify:qc:maintenance':
        'node scripts/qc/validate-maintenance-warning-ledger.mjs',
    },
  });

  writeJson(registryPath, {
    version: 1,
    surfaces: requiredSurfaceIds.map((surfaceId, index) => ({
      surfaceId,
      coverageStatus:
        hasReleaseGap && index === 0 ? 'partial' : 'ready-with-scope',
      gaps:
        hasReleaseGap && index === 0
          ? ['Browser-driven release signoff remains separate.']
          : [],
      manualChecks: [],
      evidence: [],
    })),
  });

  writeJson(majorPath, {
    version: 1,
    scenarioCount: 1,
    scenarios: [
      {
        id: 'MC-01-app-shell-navigation',
        surfaceId: 'app-shell-navigation',
        checks: [{ id: 'strict-app-shell', required: true }],
        notes: [],
      },
    ],
  });

  writeJson(journeysPath, {
    version: 1,
    requiredJourneyIds: ['campaign-long'],
    journeys: [{ id: 'campaign-long', knownLimitations: [] }],
  });

  writeJson(loggingPath, {
    version: 1,
    requiredPathIds: ['journey-runner-failure'],
    requiredTriageFields: ['runId'],
    paths: [{ pathId: 'journey-runner-failure', severity: 'error' }],
  });

  writeJson(maintenancePath, {
    version: 1,
    categories: ['file-bloat'],
    entries: [
      {
        category: 'file-bloat',
        status: 'follow-up',
      },
    ],
  });

  fs.mkdirSync(openspecChangesPath, { recursive: true });

  return {
    MEKSTATION_PACKAGE_JSON_PATH: packageJsonPath,
    MEKSTATION_QC_REGISTRY_PATH: registryPath,
    MEKSTATION_MAJOR_SCENARIOS_PATH: majorPath,
    MEKSTATION_JOURNEY_SCENARIOS_PATH: journeysPath,
    MEKSTATION_LOGGING_MAP_PATH: loggingPath,
    MEKSTATION_MAINTENANCE_LEDGER_PATH: maintenancePath,
    MEKSTATION_OPENSPEC_CHANGES_DIR: openspecChangesPath,
  };
}

function runValidator(args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(NODE, [validatorPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
}

describe('app completion gate validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-app-completion-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('summarizes the current repo completion surfaces without failing release gaps', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('# App completion readiness');
    expect(result.stdout).toContain('OpenSpec:');
    expect(result.stdout).toContain('QC registry:');
    expect(result.stdout).toContain('Release signoff gaps:');
    expect(result.stderr).toBe('');
  });

  it('fails when a required package script is missing', () => {
    const env = writeFixtureSet(tempDir, false);
    const packageJson = JSON.parse(
      fs.readFileSync(env.MEKSTATION_PACKAGE_JSON_PATH, 'utf-8'),
    );
    delete packageJson.scripts['electron:test:build'];
    writeJson(env.MEKSTATION_PACKAGE_JSON_PATH, packageJson);

    const result = runValidator([], env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'missing package script: electron:test:build',
    );
  });

  it('fails strict release mode when release signoff gaps remain', () => {
    const env = writeFixtureSet(tempDir, true);
    const result = runValidator(['--fail-on-release-gaps'], env);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Release signoff gaps: 2');
    expect(result.stderr).toContain('release signoff gaps remain: 2');
  });

  it('passes strict release mode when fixture release gaps are closed', () => {
    const env = writeFixtureSet(tempDir, false);
    const result = runValidator(['--fail-on-release-gaps'], env);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Release signoff gaps: 0');
    expect(result.stderr).toBe('');
  });
});
