#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const registryPath =
  process.env.MEKSTATION_QC_REGISTRY_PATH ??
  path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json');
const openSpecChangesDir =
  process.env.MEKSTATION_OPENSPEC_CHANGES_DIR ??
  path.join(repoRoot, 'openspec', 'changes');
const sourceAnchorsPath =
  process.env.MEKSTATION_COMBAT_CATALOG_ANCHORS_PATH ?? null;

const expectedOutOfScopeSummary = {
  total: 147,
  levels: ['--expect-level=out-of-scope:147'],
  scopes: ['--expect-scope=aggregate:3', '--expect-scope=leaf:144'],
  sections: [
    '--expect-section=actions:29',
    '--expect-section=damageAndDeath:6',
    '--expect-section=eventStream:15',
    '--expect-section=featureSupport:75',
    '--expect-section=lifecycleAndPsr:2',
    '--expect-section=pilotSkills:9',
    '--expect-section=ruleSupport:6',
    '--expect-section=validationScope:5',
  ],
};

const requiredSurfaces = [
  {
    id: 'simulation-combat-validation',
    claimIds: ['combat.validation'],
    commandIncludes: [
      'qc:combat:catalog-rules:validate',
      'validate:combat',
      'validate:combat:gaps -- --format=summary --expect-total=0',
    ],
  },
  {
    id: 'battlemech-combat-catalog-validation',
    claimIds: ['combat.catalog.battlemech'],
    commandIncludes: [
      'qc:combat:catalog-rules:validate',
      'validate:combat',
      'validate:combat:gaps -- --level=out-of-scope --format=summary',
      `--expect-total=${expectedOutOfScopeSummary.total}`,
      ...expectedOutOfScopeSummary.levels,
      ...expectedOutOfScopeSummary.scopes,
    ],
  },
  {
    id: 'behavior-class-combat-rules',
    claimIds: ['combat.behavior-class'],
    allowedCoverageStatuses: ['ready-with-scope'],
    commandIncludes: ['validate:combat'],
  },
  {
    id: 'integration-runner-interactive-parity',
    claimIds: ['combat.integration.parity'],
    allowedCoverageStatuses: ['ready-with-scope'],
    commandIncludes: ['validate:combat'],
  },
  {
    id: 'physical-weapon-runtime-boundary',
    claimIds: ['combat.physical-boundary'],
    allowedCoverageStatuses: ['ready-with-scope'],
    commandIncludes: [
      'validate:combat',
      'physicalWeaponCatalogBoundary.behavior.test.ts',
    ],
  },
  {
    id: 'non-battlemech-combat-scope-matrix',
    claimIds: ['combat.scope.non-battlemech'],
    commandIncludes: [
      'validate:combat:gaps -- --level=out-of-scope --format=summary',
      `--expect-total=${expectedOutOfScopeSummary.total}`,
      ...expectedOutOfScopeSummary.levels,
      ...expectedOutOfScopeSummary.scopes,
      ...expectedOutOfScopeSummary.sections,
    ],
  },
  {
    id: 'known-gap-honesty-audit',
    claimIds: ['combat.gaps.honesty', 'combat.known-limitations.bypass'],
    allowedCoverageStatuses: ['ready-with-scope'],
    commandIncludes: [
      'qc:known-gaps:validate',
      'qc:combat:catalog-rules:validate',
      'validate:combat:gaps -- --format=summary --expect-total=0',
      'validate:combat:gaps -- --level=out-of-scope --format=summary',
      'validate:combat',
    ],
  },
];

const defaultSourceAnchors = [
  {
    id: 'combat-suite-gap-baselines',
    path: 'scripts/validate-combat-suite.mjs',
    tokens: [
      'COMBAT_VALIDATION_TESTS',
      'battlemechCombatCatalog.contract.test.ts',
      'combatValidationRequirementCatalog.contract.test.ts',
      'physicalWeaponCatalogBoundary.behavior.test.ts',
      'scenarioObjectiveEngine.integration.test.ts',
      'physicalAttackCommands.test.ts',
      'usePhaseQueueProjection.test.ts',
      '--expect-total=0',
      `--expect-level=out-of-scope:${expectedOutOfScopeSummary.total}`,
      '--expect-section=featureSupport:75',
    ],
  },
  {
    id: 'gap-inventory-expectation-flags',
    path: 'scripts/print-combat-validation-gaps.ts',
    tokens: [
      '--expect-total',
      '--expect-level',
      '--expect-scope',
      '--expect-section',
      '--expect-ref',
      '--expect-no-ref',
      'Unresolved gap inventory baseline mismatch',
    ],
  },
  {
    id: 'official-row-classification-tests',
    path: 'src/simulation/runner/__tests__/battlemechCombatCatalog.01.covers-every-official-ranged-weapon-physical-weapon-an.fragment.ts',
    tokens: [
      'covers every official ranged weapon, physical weapon, and ammo entry',
      'maps every official ranged weapon into a non-synthetic AI weapon',
      'static engine weapon database a legacy subset of the official ranged catalog',
    ],
  },
  {
    id: 'ammo-classification-tests',
    path: 'src/simulation/runner/__tests__/battlemechCombatCatalog.02.classifies-official-ammo-rows-without-compatible-weapo.fragment.ts',
    tokens: [
      'classifies official ammo rows without compatible weapon refs as explicit gaps',
      'unsupported-rotary-ac-10-20-ammo',
      'EXPECTED_SCOPE_SPLIT_AMMO_GAP_IDS',
    ],
  },
  {
    id: 'special-family-classification-tests',
    path: 'src/simulation/runner/__tests__/battlemechCombatCatalog.04.classifies-every-official-special-combat-family-in-the.fragment.ts',
    tokens: [
      'Ultra AC',
      'Rotary AC',
      'LB-X AC',
      'Streak',
      'MML',
      'NARC',
      'Anti-Missile System',
      'TAG',
      'Artemis',
    ],
  },
  {
    id: 'known-limitation-trap-tests',
    path: 'src/simulation/runner/__tests__/battlemechCombatCatalog.19.audits-known-limitation-traps-without-filtering-combat.fragment.ts',
    tokens: [
      'audits known-limitation traps without filtering combat validation failures',
      'prevents known-limitation filtering from gating the catalog validation lane',
      'KNOWN_LIMITATION_VALIDATION_TRAPS',
    ],
  },
  {
    id: 'known-gap-honesty-release-guard',
    path: 'scripts/qc/validate-known-gap-honesty.mjs',
    tokens: [
      'legacy-only-suppression-code',
      'stale-release-claim',
      'known-gap-honesty-audit must be ready-with-scope',
      'qc:known-gaps:validate',
    ],
  },
  {
    id: 'physical-weapon-runtime-boundary-tests',
    path: 'src/simulation/runner/__tests__/physicalWeaponCatalogBoundary.behavior.test.ts',
    tokens: [
      'partitions every official physical weapon into a runtime attack or explicit modifier-only entry',
      'SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES',
      'modifierOnlyPhysicalWeapons',
    ],
  },
  {
    id: 'out-of-scope-scope-split-tests',
    path: 'src/simulation/runner/__tests__/combatValidationCatalog.04.keeps-non-battlemech-scope-rows-auditable-without-maki.fragment.ts',
    tokens: [
      'keeps non-BattleMech scope rows auditable without making them BattleMech blockers',
      'outOfScopeRows).toHaveLength(147)',
      'non-battlemech-combat-system-split',
    ],
  },
  {
    id: 'catalog-rules-parity-spec',
    path: 'openspec/specs/combat-catalog-rules-parity/spec.md',
    tokens: [
      'Official Combat Catalog Parity Matrix',
      'Catalog Fallback Guard',
      'Catalog Parity Validation Commands',
      'Known Limitation Suppression Audit',
      'Non-BattleMech Boundary',
    ],
  },
];

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
  };
}

function issue(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function loadSourceAnchors() {
  if (!sourceAnchorsPath) return defaultSourceAnchors;
  return loadJson(sourceAnchorsPath);
}

function activeChangeExists(changeId) {
  return fs.existsSync(path.join(openSpecChangesDir, changeId));
}

function joinedCommands(surface) {
  return (surface.commands ?? []).join('\n');
}

function validateSurface(contract, surfaceById, issues) {
  const surface = surfaceById.get(contract.id);
  if (!surface) {
    issues.push(
      issue(
        'error',
        'surface-missing',
        `Required combat catalog surface ${contract.id} is missing.`,
        { surfaceId: contract.id },
      ),
    );
    return null;
  }

  for (const claimId of contract.claimIds) {
    if (!surface.claimIds?.includes(claimId)) {
      issues.push(
        issue(
          'error',
          'claim-missing',
          `${contract.id} must include claim ${claimId}.`,
          { surfaceId: contract.id, claimId },
        ),
      );
    }
  }

  if (
    contract.allowedCoverageStatuses &&
    !contract.allowedCoverageStatuses.includes(surface.coverageStatus)
  ) {
    issues.push(
      issue(
        'error',
        'coverage-status-not-ready',
        `${contract.id} must keep coverageStatus in ${contract.allowedCoverageStatuses.join(', ')}.`,
        {
          surfaceId: contract.id,
          coverageStatus: surface.coverageStatus,
          allowedCoverageStatuses: contract.allowedCoverageStatuses,
        },
      ),
    );
  }

  const commands = joinedCommands(surface);
  for (const commandToken of contract.commandIncludes) {
    if (!commands.includes(commandToken)) {
      issues.push(
        issue(
          'error',
          'command-missing',
          `${contract.id} must expose a command containing ${commandToken}.`,
          { surfaceId: contract.id, commandToken },
        ),
      );
    }
  }

  for (const changeRef of surface.activeChangeRefs ?? []) {
    if (!activeChangeExists(changeRef)) {
      issues.push(
        issue(
          'error',
          'stale-active-change-ref',
          `${contract.id} references stale or inactive OpenSpec change ${changeRef}.`,
          { surfaceId: contract.id, changeRef },
        ),
      );
    }
  }

  return {
    surfaceId: contract.id,
    claimIds: contract.claimIds,
    coverageStatus: surface.coverageStatus,
    commandCount: surface.commands?.length ?? 0,
    activeChangeRefs: surface.activeChangeRefs ?? [],
  };
}

function validateSourceAnchor(anchor, issues) {
  const absolutePath = path.join(repoRoot, anchor.path);
  if (!fs.existsSync(absolutePath)) {
    issues.push(
      issue(
        'error',
        'source-anchor-missing',
        `Required combat catalog source anchor ${anchor.path} is missing.`,
        { anchorId: anchor.id, path: anchor.path },
      ),
    );
    return {
      id: anchor.id,
      path: anchor.path,
      tokenCount: anchor.tokens.length,
      present: false,
    };
  }

  const text = readRepoFile(anchor.path);
  for (const token of anchor.tokens) {
    if (!text.includes(token)) {
      issues.push(
        issue(
          'error',
          'source-anchor-token-missing',
          `${anchor.id} (${anchor.path}) must contain combat catalog parity token ${token}.`,
          { anchorId: anchor.id, path: anchor.path, token },
        ),
      );
    }
  }

  return {
    id: anchor.id,
    path: anchor.path,
    tokenCount: anchor.tokens.length,
    present: true,
  };
}

function buildManifest() {
  const issues = [];
  const registry = loadJson(registryPath);
  const sourceAnchors = loadSourceAnchors();
  const surfaceById = new Map(
    registry.surfaces.map((surface) => [surface.surfaceId, surface]),
  );
  const surfaces = requiredSurfaces
    .map((contract) => validateSurface(contract, surfaceById, issues))
    .filter(Boolean);
  const anchors = sourceAnchors.map((anchor) =>
    validateSourceAnchor(anchor, issues),
  );
  const staleActiveChangeRefCount = surfaces.reduce(
    (total, surface) => total + surface.activeChangeRefs.length,
    0,
  );

  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');

  return {
    version: 1,
    status: errors.length > 0 ? 'fail' : 'pass',
    registryPath: path.relative(repoRoot, registryPath).replaceAll('\\', '/'),
    requiredSurfaceCount: requiredSurfaces.length,
    validatedSurfaceCount: surfaces.length,
    sourceAnchorCount: sourceAnchors.length,
    expectedOutOfScopeSummary,
    staleActiveChangeRefCount,
    errors,
    warnings,
    issues,
    surfaces,
    anchors,
  };
}

function printIssues(issues) {
  for (const item of issues) {
    const prefix = item.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`${prefix}: ${item.message}`);
  }
}

const options = parseArgs(process.argv.slice(2));
const manifest = buildManifest();

if (options.json) {
  console.log(JSON.stringify(manifest, null, 2));
} else {
  printIssues(manifest.issues);
  console.log(
    `[qc:combat:catalog-rules] surfaces=${manifest.validatedSurfaceCount}/${manifest.requiredSurfaceCount} anchors=${manifest.sourceAnchorCount} expectedOutOfScope=${manifest.expectedOutOfScopeSummary.total} staleRefs=${manifest.staleActiveChangeRefCount} errors=${manifest.errors.length} warnings=${manifest.warnings.length}`,
  );
}

process.exit(manifest.errors.length > 0 ? 1 : 0);
