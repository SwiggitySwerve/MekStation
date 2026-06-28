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
  'behavior-class-combat-rules',
  'integration-runner-interactive-parity',
  'physical-weapon-runtime-boundary',
  'non-battlemech-combat-scope-matrix',
  'compendium-unit-data',
  'customizer-construction-bv-export',
  'multiplayer-coop-sync',
  'replay-audit-history',
  'desktop-api-security',
  'maintenance-code-health',
  'openspec-ci-quality',
  'known-gap-honesty-audit',
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
      'qc:openspec-ci:validate':
        'node scripts/qc/validate-openspec-ci-quality.mjs',
      'verify:app-completion':
        'npm run qc:app-completion && npm run verify:qc && npm run verify:rules && npm run electron:test:build',
      'verify:app-completion:release':
        'npm run qc:app-completion:release && npm run verify:app-completion',
      'verify:qc':
        'npm run qc:openspec-ci:validate && npm run qc:lifecycle:status',
      'verify:rules':
        'npm run validate:combat:gaps -- --format=summary --expect-total=0 && npm run validate:combat:gaps -- --level=out-of-scope --format=summary --expect-total=147 && npx openspec validate --all --strict',
      'electron:test:build': 'cd desktop && npm run test:build',
      'validate:combat:gaps': 'npx tsx scripts/print-combat-validation-gaps.ts',
      'verify:qc:app-shell':
        'npx playwright test --project=chromium e2e/app-shell-route-proof.spec.ts',
      'verify:qc:campaign-economy':
        'npm run verify:qc:campaign-economy:browser',
      'verify:qc:campaign-operations':
        'npm test CampaignOperationsQueueCard.test.tsx',
      'qc:campaign-long:browser':
        'npx playwright test e2e/campaign-long-browser-signoff.spec.ts',
      'verify:qc:campaign-long':
        'npm run qc:campaign-long:stability && npm run qc:campaign-long:browser',
      'qc:combat-4v4:validate': 'node scripts/qc/validate-combat-4v4-qc.mjs',
      'verify:qc:combat-4v4':
        'npm run qc:combat-4v4:validate && npm test combat4v4JourneyProof.test.ts',
      'verify:qc:gm:campaign-ledger': 'npm run qc:gm:campaign-ledger:validate',
      'verify:qc:gm:time-cascade': 'npm run qc:gm:time-cascade:validate',
      'qc:wave3:validate':
        'node scripts/qc/validate-wave3-encounter-tactical.mjs',
      'verify:qc:wave3': 'npm run qc:wave3:validate',
      'qc:wave4:validate': 'node scripts/qc/validate-wave4-scope-recovery.mjs',
      'qc:nonbattlemech:scope:validate':
        'npx tsx scripts/qc/validate-nonbattlemech-scope-matrix.ts',
      'verify:qc:wave4': 'npm run qc:wave4:validate',
      'verify:qc:multiplayer-reliability':
        'npm run verify:qc:multiplayer:browser',
      'qc:known-gaps:validate':
        'node scripts/qc/validate-known-gap-honesty.mjs',
      'verify:qc:known-gaps': 'npm run qc:known-gaps:validate',
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
        successCriteria: [],
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

  it('buckets child combat partials into the priority release summary', () => {
    const env = writeFixtureSet(tempDir, false);
    const registry = JSON.parse(
      fs.readFileSync(env.MEKSTATION_QC_REGISTRY_PATH, 'utf-8'),
    );
    const behaviorSurface = registry.surfaces.find(
      (surface: { surfaceId: string }) =>
        surface.surfaceId === 'behavior-class-combat-rules',
    );
    behaviorSurface.coverageStatus = 'partial';
    writeJson(env.MEKSTATION_QC_REGISTRY_PATH, registry);

    const result = runValidator(['--json'], env);
    const report = JSON.parse(result.stdout);
    const wave3 = report.priority.find(
      (wave: { wave: string }) => wave.wave === 'Wave 3',
    );

    expect(result.status).toBe(0);
    expect(report.releaseGaps).toEqual([
      {
        surfaceId: 'behavior-class-combat-rules',
        kind: 'coverage-status',
        detail: 'coverageStatus=partial',
      },
    ]);
    expect(wave3.releaseGapCount).toBe(1);
    expect(wave3.surfaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surfaceId: 'behavior-class-combat-rules',
          gapCount: 1,
        }),
      ]),
    );
  });

  it('does not count positive knownLimitations evidence as a release gap', () => {
    const env = writeFixtureSet(tempDir, false);
    const registry = JSON.parse(
      fs.readFileSync(env.MEKSTATION_QC_REGISTRY_PATH, 'utf-8'),
    );
    const catalogSurface = registry.surfaces.find(
      (surface: { surfaceId: string }) =>
        surface.surfaceId === 'battlemech-combat-catalog-validation',
    );
    catalogSurface.evidence = [
      'Catalog review confirmed knownLimitations bypass coverage in the BattleMech lane.',
    ];
    writeJson(env.MEKSTATION_QC_REGISTRY_PATH, registry);

    const result = runValidator(['--json'], env);
    const report = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(report.releaseGaps).toEqual([]);
    expect(report.summary.releaseSignoff.gaps).toBe(0);
  });

  it('counts release-signoff wording in major scenario success criteria', () => {
    const env = writeFixtureSet(tempDir, false);
    const majorScenarios = JSON.parse(
      fs.readFileSync(env.MEKSTATION_MAJOR_SCENARIOS_PATH, 'utf-8'),
    );
    majorScenarios.scenarios[0].successCriteria = [
      'Timeline export remains visible as a release-signoff gap until browser proof lands.',
    ];
    writeJson(env.MEKSTATION_MAJOR_SCENARIOS_PATH, majorScenarios);

    const result = runValidator(['--json'], env);
    const report = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(report.releaseGaps).toEqual([
      {
        surfaceId: 'app-shell-navigation',
        kind: 'major-scenario',
        detail:
          'Timeline export remains visible as a release-signoff gap until browser proof lands.',
      },
    ]);
    expect(report.summary.releaseSignoff.gaps).toBe(1);
  });

  it('counts required journey steps without proof backing as release gaps', () => {
    const env = writeFixtureSet(tempDir, false);
    const journeyScenarios = JSON.parse(
      fs.readFileSync(env.MEKSTATION_JOURNEY_SCENARIOS_PATH, 'utf-8'),
    );
    journeyScenarios.requiredJourneyIds.push('character-build');
    journeyScenarios.journeys.push({
      id: 'character-build',
      surfaceIds: ['force-pilot-encounter-setup'],
      knownLimitations: [],
      steps: [
        {
          id: 'generate-character',
          required: true,
          syntheticBacking: true,
        },
      ],
    });
    writeJson(env.MEKSTATION_JOURNEY_SCENARIOS_PATH, journeyScenarios);

    const result = runValidator(['--json'], env);
    const report = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(report.releaseGaps).toEqual([
      {
        surfaceId: 'force-pilot-encounter-setup',
        kind: 'journey-execution-backing',
        detail:
          'character-build/generate-character is required but release backing is incomplete (syntheticBacking=true executionBacking=missing proofCommands=0).',
      },
    ]);
    expect(report.summary.releaseSignoff.gaps).toBe(1);
  });

  it('does not count release gate explanations that are not signoff gaps', () => {
    const env = writeFixtureSet(tempDir, false);
    const majorScenarios = JSON.parse(
      fs.readFileSync(env.MEKSTATION_MAJOR_SCENARIOS_PATH, 'utf-8'),
    );
    majorScenarios.scenarios[0].successCriteria = [
      'Raw maintenance inventory can be captured as diagnostic evidence without being mistaken for a pass/fail release gate.',
    ];
    writeJson(env.MEKSTATION_MAJOR_SCENARIOS_PATH, majorScenarios);

    const result = runValidator(['--json'], env);
    const report = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(report.releaseGaps).toEqual([]);
    expect(report.summary.releaseSignoff.gaps).toBe(0);
  });
});
