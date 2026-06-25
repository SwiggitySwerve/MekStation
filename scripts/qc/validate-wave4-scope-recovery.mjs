#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const packageJsonPath =
  process.env.MEKSTATION_PACKAGE_JSON_PATH ??
  path.join(repoRoot, 'package.json');
const registryPath =
  process.env.MEKSTATION_QC_REGISTRY_PATH ??
  path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json');
const sourceAnchorsPath =
  process.env.MEKSTATION_WAVE4_SOURCE_ANCHORS_PATH ?? null;

const nonBattleMechGapTokens = [
  'validate:combat:gaps',
  '--level=out-of-scope',
  '--expect-total=147',
  '--expect-level=out-of-scope:147',
  '--expect-scope=aggregate:3',
  '--expect-scope=leaf:144',
  '--expect-section=actions:29',
  '--expect-section=damageAndDeath:6',
  '--expect-section=eventStream:15',
  '--expect-section=featureSupport:75',
  '--expect-section=lifecycleAndPsr:2',
  '--expect-section=pilotSkills:9',
  '--expect-section=ruleSupport:6',
  '--expect-section=validationScope:5',
];

const requiredPackageScripts = [
  {
    id: 'qc:wave4:validate',
    tokens: ['validate-wave4-scope-recovery.mjs'],
  },
  {
    id: 'verify:qc:wave4:customizer-data',
    tokens: [
      'validate:assets:strict',
      'schema:gen-check',
      'validate:bv',
      'validate:vehicle',
      'validate:aerospace',
      'validate:ba-bv',
      'validate:proto',
      'validate:infantry',
    ],
  },
  {
    id: 'verify:qc:wave4:nonbattlemech-scope',
    tokens: [
      'qc:nonbattlemech:scope:validate',
      ...nonBattleMechGapTokens,
      'validate:combat',
    ],
  },
  {
    id: 'qc:nonbattlemech:scope:validate',
    tokens: ['validate-nonbattlemech-scope-matrix.ts'],
  },
  {
    id: 'verify:qc:multiplayer-reliability',
    tokens: [
      'verify:qc:multiplayer:contracts',
      'verify:qc:multiplayer:browser',
    ],
  },
  {
    id: 'verify:qc:replay-recovery',
    tokens: [
      'replay-determinism.integration.test.ts',
      'useGameplayStore.recover.test.ts',
      'InteractiveSession.recovery.test.ts',
      'active-session-recovery.spec.ts',
      'e2e/replay-player.spec.ts',
    ],
  },
  {
    id: 'verify:qc:wave4',
    tokens: [
      'qc:wave4:validate',
      'verify:qc:wave4:customizer-data',
      'verify:qc:wave4:nonbattlemech-scope',
      'verify:qc:multiplayer-reliability',
      'verify:qc:replay-recovery',
    ],
  },
];

const requiredSurfaces = [
  {
    id: 'customizer-construction-bv-export',
    commandIncludes: [
      'validate:bv',
      'validate:vehicle',
      'validate:aerospace',
      'validate:ba-bv',
      'validate:proto',
      'validate:infantry',
      'qc:wave4:validate',
    ],
    manualIncludes: ['representative unit per supported family'],
    gapIncludes: ['live reference assets'],
  },
  {
    id: 'compendium-unit-data',
    commandIncludes: [
      'validate:assets:strict',
      'schema:gen-check',
      'qc:wave4:validate',
    ],
    manualIncludes: [
      'BattleMech',
      'vehicle',
      'aerospace',
      'battle armor',
      'infantry',
      'ProtoMech',
    ],
    gapIncludes: ['Non-BattleMech systems need separate matrices'],
  },
  {
    id: 'non-battlemech-combat-scope-matrix',
    claimId: 'combat.scope.non-battlemech',
    commandIncludes: [
      'qc:nonbattlemech:scope:validate',
      ...nonBattleMechGapTokens,
      'validate:combat',
      'qc:wave4:validate',
    ],
  },
  {
    id: 'multiplayer-coop-sync',
    commandIncludes: [
      'verify:qc:multiplayer-reliability',
      'verify:qc:multiplayer:contracts',
      'verify:qc:multiplayer:browser',
      'validate:multiplayer:packaged-socket',
      'qc:wave4:validate',
    ],
    testIncludes: [
      'e2e/p2p-sync.spec.ts',
      'e2e/playtest-mp-smoke.spec.ts',
      'e2e/playtest-coop-route-smoke.spec.ts',
      'e2e/multiplayer-live-vault-auth.spec.ts',
      'multiplayerMatchesFog.test.ts',
      'multiplayerSpectate.test.ts',
      'phase4Multiplayer.test.ts',
      'turnOwnership.test.ts',
      'reconnectionFlow.test.ts',
      'fogOfWar.test.ts',
    ],
    manualIncludes: [
      'unit-backed two-window/vault-auth',
      'fog-limited guest tactical state',
    ],
    gapIncludes: [
      'true two-window vault-auth live launch/turn handoff',
      'unit-backed fog-limited guest tactical state',
      'packaged runtime kill/reconnect against the durable match store',
    ],
  },
  {
    id: 'replay-audit-history',
    commandIncludes: ['verify:qc:replay-recovery', 'qc:wave4:validate'],
    testIncludes: [
      'replay-determinism.integration.test.ts',
      'useGameplayStore.recover.test.ts',
      'InteractiveSession.recovery.test.ts',
      'e2e/active-session-recovery.spec.ts',
      'e2e/replay-player.spec.ts',
    ],
    manualIncludes: ['Timeline export download'],
    gapIncludes: ['Replay library export'],
  },
];

const defaultSourceAnchors = [
  {
    id: 'family-bv-validator-battlemech',
    path: 'scripts/validate-bv.ts',
    tokens: ['ValidationResult', 'indexBV', 'calculatedBV', 'percentDiff'],
  },
  {
    id: 'family-bv-validator-vehicle',
    path: 'scripts/validate-vehicle-bv.ts',
    tokens: ['Vehicle BV Parity Harness', 'unitName', 'computedBV', 'mulBV'],
  },
  {
    id: 'family-bv-validator-aerospace',
    path: 'scripts/validate-aerospace-bv.ts',
    tokens: [
      'Aerospace BV Parity Validation CLI',
      'status: "deferred"',
      'calculateAerospaceBVFromUnit',
    ],
  },
  {
    id: 'family-bv-validator-battle-armor',
    path: 'scripts/validate-battle-armor-bv.ts',
    tokens: [
      'Battle Armor BV Parity Harness',
      'calculateBattleArmorBV',
      'status: ReportStatus',
    ],
  },
  {
    id: 'family-bv-validator-protomech',
    path: 'scripts/validate-proto-bv.ts',
    tokens: [
      'ProtoMech BV Parity Validation CLI',
      'status: "deferred"',
      'protomech-bv-validation-report.json',
    ],
  },
  {
    id: 'family-bv-validator-infantry',
    path: 'scripts/validate-infantry-bv.ts',
    tokens: ['Infantry BV Parity Harness', 'computedBV', 'mulBV', 'deltaPct'],
  },
  {
    id: 'non-battlemech-gap-inventory',
    path: 'scripts/print-combat-validation-gaps.ts',
    tokens: [
      'getCombatValidationOutOfScopeRows',
      '--expect-total',
      '--expect-level',
      '--expect-section',
    ],
  },
  {
    id: 'non-battlemech-scope-matrix',
    path: 'docs/qc/non-battlemech-combat-scope-matrix.json',
    tokens: [
      '"requiredFamilyIds"',
      '"ground-vehicles"',
      '"vtol"',
      '"aerospace-capital-lam"',
      '"battle-armor"',
      '"infantry"',
      '"protomech"',
      '"rowCoverageBuckets"',
      '"expectedOutOfScopeSummary"',
    ],
  },
  {
    id: 'non-battlemech-scope-validator',
    path: 'scripts/qc/validate-nonbattlemech-scope-matrix.ts',
    tokens: [
      'getCombatValidationOutOfScopeRows',
      'requiredFamilyIds',
      'validateRowCoverageBuckets',
      'out-of-scope-row-uncovered',
    ],
  },
  {
    id: 'multiplayer-capstone-proof',
    path: 'src/__tests__/integration/phase4Multiplayer.test.ts',
    tokens: [
      'Phase 4 Multiplayer Capstone E2E Test',
      'Drop+rejoin',
      'CombatOutcomeReady',
      'EXACTLY ONCE',
    ],
  },
  {
    id: 'multiplayer-browser-boundary',
    path: 'e2e/playtest-mp-smoke.spec.ts',
    tokens: [
      'Phase-4 Multiplayer Smoke Walkthrough',
      'Explicitly out of scope',
      'Actual two-window match flow',
      'Server-kill + reconnect durability',
    ],
  },
  {
    id: 'coop-browser-route-proof',
    path: 'e2e/playtest-coop-route-smoke.spec.ts',
    tokens: [
      'Co-op Route Smoke Walkthrough',
      'single-context',
      'coop-session-badge',
      'vault-auth two-identity follow-up',
    ],
  },
  {
    id: 'multiplayer-live-vault-auth-proof',
    path: 'e2e/multiplayer-live-vault-auth.spec.ts',
    tokens: [
      'Multiplayer live vault-auth proof',
      'two browser contexts',
      'locked E2E-only seam',
      'advances the initial server-owned phase',
      'placeholder units',
    ],
  },
  {
    id: 'active-session-recovery-proof',
    path: 'e2e/active-session-recovery.spec.ts',
    tokens: [
      'match-log IndexedDB',
      'generated non-demo match id',
      'without falling back to demo state',
      'MATCH_LOG_DB_NAME',
    ],
  },
  {
    id: 'replay-library-browser-proof',
    path: 'e2e/replay-player.spec.ts',
    tokens: [
      'Replay Library Browser Round-Trip',
      'jsonl-loader-file-input',
      'Show keyboard shortcuts',
      'buildReplayFixtureEvents',
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function normalizeSlash(value) {
  return value.replaceAll('\\', '/');
}

function allSurfaceText(surface) {
  return normalizeSlash(
    [
      ...(surface.commands ?? []),
      ...(surface.tests ?? []),
      ...(surface.evidence ?? []),
      ...(surface.gaps ?? []),
      ...(surface.manualChecks ?? []),
    ].join('\n'),
  );
}

function containsToken(values, token) {
  return values?.some((value) => value.includes(token)) ?? false;
}

function validatePackageScript(contract, scripts, issues) {
  const script = scripts[contract.id];
  if (!script) {
    issues.push(
      issue(
        'error',
        'package-script-missing',
        `Required Wave 4 package script ${contract.id} is missing.`,
        { scriptId: contract.id },
      ),
    );
    return { scriptId: contract.id, tokenCount: contract.tokens.length };
  }

  for (const token of contract.tokens) {
    if (!script.includes(token)) {
      issues.push(
        issue(
          'error',
          'package-script-token-missing',
          `${contract.id} must include ${token}.`,
          { scriptId: contract.id, token },
        ),
      );
    }
  }

  return { scriptId: contract.id, tokenCount: contract.tokens.length };
}

function validateSurface(contract, surfaceById, issues) {
  const surface = surfaceById.get(contract.id);
  if (!surface) {
    issues.push(
      issue(
        'error',
        'surface-missing',
        `Required Wave 4 surface ${contract.id} is missing.`,
        { surfaceId: contract.id },
      ),
    );
    return null;
  }

  if (contract.claimId && !surface.claimIds?.includes(contract.claimId)) {
    issues.push(
      issue(
        'error',
        'surface-claim-missing',
        `${contract.id} must include claim ${contract.claimId}.`,
        { surfaceId: contract.id, claimId: contract.claimId },
      ),
    );
  }

  for (const token of contract.commandIncludes ?? []) {
    if (!containsToken(surface.commands, token)) {
      issues.push(
        issue(
          'error',
          'surface-command-missing',
          `${contract.id} must expose a command containing ${token}.`,
          { surfaceId: contract.id, token },
        ),
      );
    }
  }

  for (const token of contract.testIncludes ?? []) {
    if (!containsToken(surface.tests, token)) {
      issues.push(
        issue(
          'error',
          'surface-test-missing',
          `${contract.id} must list test proof ${token}.`,
          { surfaceId: contract.id, token },
        ),
      );
    }
  }

  for (const token of contract.manualIncludes ?? []) {
    if (!containsToken(surface.manualChecks, token)) {
      issues.push(
        issue(
          'error',
          'surface-manual-boundary-missing',
          `${contract.id} must keep manual boundary language containing ${token}.`,
          { surfaceId: contract.id, token },
        ),
      );
    }
  }

  for (const token of contract.gapIncludes ?? []) {
    if (!containsToken(surface.gaps, token)) {
      issues.push(
        issue(
          'error',
          'surface-gap-honesty-missing',
          `${contract.id} must keep honest gap language containing ${token}.`,
          { surfaceId: contract.id, token },
        ),
      );
    }
  }

  return {
    surfaceId: contract.id,
    coverageStatus: surface.coverageStatus,
    commandCount: surface.commands?.length ?? 0,
    testCount: surface.tests?.length ?? 0,
    manualBoundaryCount: surface.manualChecks?.length ?? 0,
    gapCount: surface.gaps?.length ?? 0,
    textLength: allSurfaceText(surface).length,
  };
}

function validateSourceAnchor(anchor, issues) {
  const absolutePath = path.join(repoRoot, anchor.path);
  if (!fs.existsSync(absolutePath)) {
    issues.push(
      issue(
        'error',
        'source-anchor-missing',
        `Required Wave 4 source anchor ${anchor.path} is missing.`,
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
          `${anchor.id} (${anchor.path}) must contain ${token}.`,
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
  const packageJson = readJson(packageJsonPath);
  const registry = readJson(registryPath);
  const sourceAnchors = sourceAnchorsPath
    ? readJson(sourceAnchorsPath)
    : defaultSourceAnchors;
  const scripts = packageJson.scripts ?? {};
  const surfaceById = new Map(
    registry.surfaces.map((surface) => [surface.surfaceId, surface]),
  );

  const packageScripts = requiredPackageScripts.map((contract) =>
    validatePackageScript(contract, scripts, issues),
  );
  const surfaces = requiredSurfaces
    .map((contract) => validateSurface(contract, surfaceById, issues))
    .filter(Boolean);
  const anchors = sourceAnchors.map((anchor) =>
    validateSourceAnchor(anchor, issues),
  );
  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');

  return {
    version: 1,
    status: errors.length > 0 ? 'fail' : 'pass',
    packageJsonPath: normalizeSlash(path.relative(repoRoot, packageJsonPath)),
    registryPath: normalizeSlash(path.relative(repoRoot, registryPath)),
    requiredPackageScriptCount: requiredPackageScripts.length,
    requiredSurfaceCount: requiredSurfaces.length,
    sourceAnchorCount: sourceAnchors.length,
    packageScripts,
    surfaces,
    anchors,
    errors,
    warnings,
    issues,
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
    `[qc:wave4] surfaces=${manifest.surfaces.length}/${manifest.requiredSurfaceCount} packageScripts=${manifest.packageScripts.length}/${manifest.requiredPackageScriptCount} anchors=${manifest.sourceAnchorCount} errors=${manifest.errors.length} warnings=${manifest.warnings.length}`,
  );
}

process.exit(manifest.errors.length > 0 ? 1 : 0);
