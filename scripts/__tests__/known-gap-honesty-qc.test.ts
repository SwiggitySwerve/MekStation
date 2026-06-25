import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;
const validatorPath = path.resolve(
  repoRoot,
  'scripts/qc/validate-known-gap-honesty.mjs',
);

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function writeJson(filePath: string, value: unknown): void {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFixtureSet(tempDir: string): NodeJS.ProcessEnv {
  const packageJsonPath = path.join(tempDir, 'package.json');
  const registryPath = path.join(tempDir, 'registry.json');
  const graphPath = path.join(tempDir, 'graph.json');
  const knownLimitationsPath = path.join(tempDir, 'knownLimitations.ts');
  const knownLimitationsDocPath = path.join(tempDir, 'known-limitations.md');
  const scopeContractPath = path.join(tempDir, 'combatValidationScope.test.ts');
  const catalogTrapPath = path.join(tempDir, 'catalogTrap.test.ts');
  const combatSuitePath = path.join(tempDir, 'validate-combat-suite.mjs');

  writeJson(packageJsonPath, {
    scripts: {
      'qc:known-gaps:validate':
        'node scripts/qc/validate-known-gap-honesty.mjs',
      'verify:qc:known-gaps':
        'npm run qc:known-gaps:validate && npm.cmd test -- --watchAll=false',
    },
  });

  writeJson(registryPath, {
    version: 1,
    surfaces: [
      {
        surfaceId: 'known-gap-honesty-audit',
        coverageStatus: 'ready-with-scope',
        commands: [
          'npm.cmd run qc:known-gaps:validate',
          'npm.cmd run qc:combat:catalog-rules:validate',
          'npm.cmd run validate:combat:gaps -- --format=summary --expect-total=0',
          'npm.cmd run validate:combat:gaps -- --level=out-of-scope --format=summary',
          'npm.cmd run validate:combat',
        ],
        manualChecks: [],
        evidence: ['qc:known-gaps:validate keeps current QC wording guarded.'],
        gaps: [
          'Historical audit docs remain preserved as dated evidence; current roadmap claims are guarded by qc:known-gaps:validate.',
        ],
      },
    ],
  });

  writeJson(graphPath, {
    version: 1,
    nodes: [
      {
        id: 'surface:known-gap-honesty-audit',
        coverageStatus: 'ready-with-scope',
      },
      {
        id: 'evidence:known-gap-honesty-audit:registry',
        entries: ['qc:known-gaps:validate keeps current QC wording guarded.'],
      },
    ],
    edges: [],
  });

  writeText(
    knownLimitationsPath,
    [
      'const LEGACY_GENERIC_DETECTOR_CATEGORIES = new Set();',
      'const legacyGeneric = true;',
      'const legacyGenericDetector = true;',
      'if (legacyGeneric === true || legacyGenericDetector === true) {}',
      'export function getLimitationPatternCategory() {}',
      'export function filterKnownLimitations() {}',
      'export function partitionViolations() {}',
    ].join('\n'),
  );

  writeText(
    knownLimitationsDocPath,
    [
      'NOT the feature-status source of truth',
      'legacy generic detectors',
      'New validation invariants',
      'visible by default',
      'legacy generic detectors only',
    ].join('\n'),
  );

  writeText(
    scopeContractPath,
    [
      'keeps BattleMech validation traps visible despite broad limitation text matches',
      'prevents known-limitation filters from becoming catalog gatekeepers',
      "'filter' + 'KnownLimitations'",
      "'partition' + 'Violations'",
      'known-limitation-bypass',
    ].join('\n'),
  );

  writeText(
    catalogTrapPath,
    [
      'audits known-limitation traps without filtering combat validation failures',
      'prevents known-limitation filtering from gating the catalog validation lane',
      'KNOWN_LIMITATION_VALIDATION_TRAPS',
    ].join('\n'),
  );

  writeText(
    combatSuitePath,
    [
      'combatValidationScope.contract.test.ts',
      'battlemechCombatCatalog.contract.test.ts',
    ].join('\n'),
  );

  return {
    MEKSTATION_PACKAGE_JSON_PATH: packageJsonPath,
    MEKSTATION_QC_REGISTRY_PATH: registryPath,
    MEKSTATION_QC_GRAPH_PATH: graphPath,
    MEKSTATION_KNOWN_LIMITATIONS_PATH: knownLimitationsPath,
    MEKSTATION_KNOWN_LIMITATIONS_DOC_PATH: knownLimitationsDocPath,
    MEKSTATION_COMBAT_SCOPE_CONTRACT_TEST_PATH: scopeContractPath,
    MEKSTATION_CATALOG_TRAP_TEST_PATH: catalogTrapPath,
    MEKSTATION_COMBAT_SUITE_PATH: combatSuitePath,
    MEKSTATION_KNOWN_GAP_RELEASE_DOC_PATHS: [registryPath, graphPath].join(
      path.delimiter,
    ),
  };
}

function runValidator(args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(NODE, [validatorPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
}

describe('known-gap honesty QC validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-known-gap-qc-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current repo known-gap honesty surface', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[qc:known-gaps]');
    expect(result.stdout).toContain('anchors=5');
    expect(result.stdout).toContain('errors=0');
  });

  it('emits automation-friendly JSON for the known-gap honesty gate', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      anchorCount: number;
      surface: { coverageStatus: string };
      packageScripts: string[];
    };
    expect(manifest.status).toBe('pass');
    expect(manifest.anchorCount).toBe(5);
    expect(manifest.surface.coverageStatus).toBe('ready-with-scope');
    expect(manifest.packageScripts).toEqual(
      expect.arrayContaining(['qc:known-gaps:validate']),
    );
  });

  it('rejects stale known-gap wording in current release docs', () => {
    const env = writeFixtureSet(tempDir);
    fs.appendFileSync(
      env.MEKSTATION_QC_GRAPH_PATH!,
      '\nknownLimitations bypass drift\n',
    );

    const result = runValidator([], env);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('stale known-gap wording');
    expect(result.stdout).toContain('knownLimitations bypass drift');
  });

  it('rejects retired broad bypass invariant posture in knownLimitations', () => {
    const env = writeFixtureSet(tempDir);
    fs.appendFileSync(
      env.MEKSTATION_KNOWN_LIMITATIONS_PATH!,
      '\nconst KNOWN_LIMITATION_BYPASS_INVARIANTS = [];\n',
    );

    const result = runValidator([], env);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('KNOWN_LIMITATION_BYPASS_INVARIANTS');
  });

  it('rejects registry claims that drift back to partial or manual-only', () => {
    const env = writeFixtureSet(tempDir);
    const registry = JSON.parse(
      fs.readFileSync(env.MEKSTATION_QC_REGISTRY_PATH!, 'utf-8'),
    );
    const surface = registry.surfaces[0];
    surface.coverageStatus = 'partial';
    surface.commands = surface.commands.filter(
      (command: string) => !command.includes('qc:known-gaps:validate'),
    );
    surface.manualChecks = ['Review stale suppression wording manually.'];
    writeJson(env.MEKSTATION_QC_REGISTRY_PATH!, registry);

    const result = runValidator([], env);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('must be ready-with-scope');
    expect(result.stdout).toContain('qc:known-gaps:validate');
    expect(result.stdout).toContain('manual checks keep it');
  });
});
