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
const majorScenariosPath =
  process.env.MEKSTATION_MAJOR_SCENARIOS_PATH ??
  path.join(
    repoRoot,
    'docs',
    'qc',
    'mekstation-major-capability-scenarios.json',
  );
const sourceAnchorsPath =
  process.env.MEKSTATION_WAVE3_SOURCE_ANCHORS_PATH ?? null;

const requiredPackageScripts = [
  {
    id: 'qc:wave3:validate',
    tokens: ['validate-wave3-encounter-tactical.mjs'],
  },
  {
    id: 'verify:qc:wave3',
    tokens: [
      'qc:wave3:validate',
      'verify:qc:encounter-combat-continuity',
      'verify:qc:tactical:projection',
      'verify:qc:tactical:visual',
      'verify:rules',
    ],
  },
  {
    id: 'verify:qc:encounter-combat-continuity',
    tokens: ['e2e/encounter-combat-continuity.spec.ts'],
  },
  {
    id: 'verify:qc:tactical:projection',
    tokens: ['qc:tactical:projection:validate'],
  },
  {
    id: 'verify:qc:tactical:visual',
    tokens: ['--claim=ui.tactical', '--only-browser'],
  },
];

const requiredSurfaces = [
  {
    id: 'force-pilot-encounter-setup',
    allowedCoverageStatuses: ['ready-with-scope'],
    commandIncludes: ['verify:qc:encounter-combat-continuity'],
    testIncludes: ['e2e/encounter-combat-continuity.spec.ts'],
    gapIncludes: ['multi-unit', 'custom-scenario', 'non-1v1'],
  },
  {
    id: 'gameplay-tactical-map-combat',
    claimId: 'ui.tactical',
    commandIncludes: [
      'tactical-map.movement-scenarios.test.ts',
      'tactical-map.combat-scenarios.test.ts',
      'tactical-map-visual-smoke.spec.ts',
      'validate-tactical-projection-parity.mjs',
    ],
  },
  {
    id: 'tactical-map-rules-explanation',
    claimId: 'ui.tactical.rules-explanation',
    commandIncludes: [
      'tactical-map.movement-scenarios.test.ts',
      'tactical-map.combat-scenarios.test.ts',
    ],
  },
  {
    id: 'topdown-hex-legibility',
    claimId: 'ui.tactical.topdown-legibility',
    allowedCoverageStatuses: ['ready-with-scope'],
    commandIncludes: [
      'HexMapDisplay.terrainLabels.01.test.tsx',
      'tactical-map-visual-smoke.spec.ts',
    ],
  },
  {
    id: 'movement-preview-engine-agreement',
    claimId: 'ui.tactical.movement-preview',
    commandIncludes: ['tactical-map.movement-scenarios.test.ts'],
  },
  {
    id: 'combat-preview-engine-agreement',
    claimId: 'ui.tactical.combat-preview',
    commandIncludes: [
      'tactical-map.combat-scenarios.test.ts',
      'InteractiveSession.attackProjectionAgreement.scenario.test.ts',
    ],
  },
  {
    id: 'isometric-rotatable-25d',
    claimId: 'ui.tactical.isometric-25d',
    commandIncludes: [
      'HexMapDisplay.isometric.test.ts',
      'tactical-map-visual-smoke.spec.ts',
    ],
  },
  {
    id: 'simulation-combat-validation',
    claimId: 'combat.validation',
    commandIncludes: [
      'validate:combat:gaps -- --format=summary --expect-total=0',
      'openspec validate --all --strict',
    ],
  },
];

const legacyPermissiveSmokePaths = ['e2e/encounter-flow.spec.ts'];

const requiredMajorScenarioContracts = [
  {
    id: 'MC-04-force-pilot-encounter-setup',
    commandIncludes: ['verify:qc:encounter-combat-continuity'],
    evidenceIncludes: ['e2e/encounter-combat-continuity.spec.ts'],
    forbiddenIncludes: legacyPermissiveSmokePaths,
  },
];

const defaultSourceAnchors = [
  {
    id: 'strict-encounter-continuity-proof',
    path: 'e2e/encounter-combat-continuity.spec.ts',
    tokens: [
      'non-optional path',
      'auto-resolved pre-battle launch queues and applies a campaign outcome',
      'interactive pre-battle launch queues, reloads, and applies a campaign outcome',
      'interactive weapon attack resolution queues, reloads, and applies a campaign outcome',
      'pendingBattleOutcomes',
      'processedBattleIds',
    ],
  },
  {
    id: 'tactical-browser-visual-proof',
    path: 'e2e/tactical-map-visual-smoke.spec.ts',
    tokens: [
      'expectNonBlankRender',
      'blocked-cross-hatch',
      'data-combat-los-state',
      'data-combat-invalid-reason',
      'data-isometric-visibility-rule',
      'data-isometric-camera-current-step',
      'shows selected weapon out of arc as blocked in browser',
    ],
  },
  {
    id: 'tactical-projection-parity-validator',
    path: 'scripts/qc/validate-tactical-projection-parity.mjs',
    tokens: [
      'shared-projection-builder',
      'movement-preview-commit-scenarios',
      'combat-preview-commit-scenarios',
      'browser-boundary-missing',
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

function allMajorScenarioText(scenario) {
  return normalizeSlash(
    [
      scenario.realisticFlow ?? '',
      ...(scenario.successCriteria ?? []),
      ...(scenario.notes ?? []),
      ...(scenario.checks ?? []).flatMap((check) => [
        check.command ?? '',
        ...(check.evidence ?? []),
      ]),
    ].join('\n'),
  );
}

function validatePackageScript(contract, scripts, issues) {
  const script = scripts[contract.id];
  if (!script) {
    issues.push(
      issue(
        'error',
        'package-script-missing',
        `Required Wave 3 package script ${contract.id} is missing.`,
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
        `Required Wave 3 surface ${contract.id} is missing.`,
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

  if (
    contract.allowedCoverageStatuses &&
    !contract.allowedCoverageStatuses.includes(surface.coverageStatus)
  ) {
    issues.push(
      issue(
        'error',
        'surface-coverage-status-regressed',
        `${contract.id} must keep coverageStatus in ${contract.allowedCoverageStatuses.join(', ')}.`,
        {
          surfaceId: contract.id,
          coverageStatus: surface.coverageStatus,
          allowedCoverageStatuses: contract.allowedCoverageStatuses,
        },
      ),
    );
  }

  for (const token of contract.commandIncludes ?? []) {
    if (!surface.commands?.some((command) => command.includes(token))) {
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
    if (!surface.tests?.some((testPath) => testPath.includes(token))) {
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

  for (const token of contract.gapIncludes ?? []) {
    if (!surface.gaps?.some((gap) => gap.includes(token))) {
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

  const text = allSurfaceText(surface);
  const leakedSmokePaths = legacyPermissiveSmokePaths.filter((legacyPath) =>
    text.includes(legacyPath),
  );
  for (const legacyPath of leakedSmokePaths) {
    issues.push(
      issue(
        'error',
        'legacy-smoke-release-leak',
        `${contract.id} must not use permissive ${legacyPath} as Wave 3 release proof.`,
        { surfaceId: contract.id, legacyPath },
      ),
    );
  }

  return {
    surfaceId: contract.id,
    coverageStatus: surface.coverageStatus,
    commandCount: surface.commands?.length ?? 0,
    testCount: surface.tests?.length ?? 0,
    legacySmokeLeaks: leakedSmokePaths,
  };
}

function validateSourceAnchor(anchor, issues) {
  const absolutePath = path.join(repoRoot, anchor.path);
  if (!fs.existsSync(absolutePath)) {
    issues.push(
      issue(
        'error',
        'source-anchor-missing',
        `Required Wave 3 source anchor ${anchor.path} is missing.`,
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

function validateMajorScenario(contract, scenarioById, issues) {
  const scenario = scenarioById.get(contract.id);
  if (!scenario) {
    issues.push(
      issue(
        'error',
        'major-scenario-missing',
        `Required Wave 3 major scenario ${contract.id} is missing.`,
        { scenarioId: contract.id },
      ),
    );
    return null;
  }

  for (const token of contract.commandIncludes ?? []) {
    if (!scenario.checks?.some((check) => check.command?.includes(token))) {
      issues.push(
        issue(
          'error',
          'major-scenario-command-missing',
          `${contract.id} must include a check command containing ${token}.`,
          { scenarioId: contract.id, token },
        ),
      );
    }
  }

  for (const token of contract.evidenceIncludes ?? []) {
    if (
      !scenario.checks?.some((check) =>
        check.evidence?.some((evidencePath) => evidencePath.includes(token)),
      )
    ) {
      issues.push(
        issue(
          'error',
          'major-scenario-evidence-missing',
          `${contract.id} must include scenario evidence ${token}.`,
          { scenarioId: contract.id, token },
        ),
      );
    }
  }

  const text = allMajorScenarioText(scenario);
  const legacySmokeLeaks = (contract.forbiddenIncludes ?? []).filter((token) =>
    text.includes(token),
  );
  for (const legacyPath of legacySmokeLeaks) {
    issues.push(
      issue(
        'error',
        'major-scenario-legacy-smoke-leak',
        `${contract.id} must not use permissive ${legacyPath} as major capability proof.`,
        { scenarioId: contract.id, legacyPath },
      ),
    );
  }

  return {
    scenarioId: contract.id,
    checkCount: scenario.checks?.length ?? 0,
    legacySmokeLeaks,
  };
}

function buildManifest() {
  const issues = [];
  const packageJson = readJson(packageJsonPath);
  const registry = readJson(registryPath);
  const majorScenarios = readJson(majorScenariosPath);
  const sourceAnchors = sourceAnchorsPath
    ? readJson(sourceAnchorsPath)
    : defaultSourceAnchors;
  const scripts = packageJson.scripts ?? {};
  const surfaceById = new Map(
    registry.surfaces.map((surface) => [surface.surfaceId, surface]),
  );
  const scenarioById = new Map(
    (majorScenarios.scenarios ?? []).map((scenario) => [scenario.id, scenario]),
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
  const majorScenarioContracts = requiredMajorScenarioContracts
    .map((contract) => validateMajorScenario(contract, scenarioById, issues))
    .filter(Boolean);
  const legacySmokeLeakCount =
    surfaces.reduce(
      (total, surface) => total + surface.legacySmokeLeaks.length,
      0,
    ) +
    majorScenarioContracts.reduce(
      (total, scenario) => total + scenario.legacySmokeLeaks.length,
      0,
    );
  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');

  return {
    version: 1,
    status: errors.length > 0 ? 'fail' : 'pass',
    packageJsonPath: normalizeSlash(path.relative(repoRoot, packageJsonPath)),
    registryPath: normalizeSlash(path.relative(repoRoot, registryPath)),
    majorScenariosPath: normalizeSlash(
      path.relative(repoRoot, majorScenariosPath),
    ),
    requiredPackageScriptCount: requiredPackageScripts.length,
    requiredSurfaceCount: requiredSurfaces.length,
    requiredMajorScenarioCount: requiredMajorScenarioContracts.length,
    sourceAnchorCount: sourceAnchors.length,
    legacySmokeLeakCount,
    packageScripts,
    surfaces,
    majorScenarioContracts,
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
    `[qc:wave3] surfaces=${manifest.surfaces.length}/${manifest.requiredSurfaceCount} packageScripts=${manifest.packageScripts.length}/${manifest.requiredPackageScriptCount} anchors=${manifest.sourceAnchorCount} legacySmokeLeaks=${manifest.legacySmokeLeakCount} errors=${manifest.errors.length} warnings=${manifest.warnings.length}`,
  );
}

process.exit(manifest.errors.length > 0 ? 1 : 0);
