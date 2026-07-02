#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const defaultPaths = {
  packageJson: path.join(repoRoot, 'package.json'),
  registry: path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json'),
  majorScenarios: path.join(
    repoRoot,
    'docs',
    'qc',
    'mekstation-major-capability-scenarios.json',
  ),
  journeyScenarios: path.join(
    repoRoot,
    'docs',
    'qc',
    'mekstation-journey-scenarios.json',
  ),
  loggingMap: path.join(repoRoot, 'docs', 'qc', 'mekstation-logging-map.json'),
  maintenanceLedger: path.join(
    repoRoot,
    'docs',
    'qc',
    'maintenance-warning-ledger.json',
  ),
  openspecChanges: path.join(repoRoot, 'openspec', 'changes'),
};

const requiredScripts = new Map([
  ['qc:app-completion', 'node scripts/qc/validate-app-completion-gate.mjs'],
  [
    'qc:app-completion:release',
    'node scripts/qc/validate-app-completion-gate.mjs --fail-on-release-gaps',
  ],
  ['qc:validate', 'node scripts/qc/validate-qc-registry.mjs'],
  ['qc:lifecycle:status', 'node scripts/qc/report-lifecycle-qc-status.mjs'],
  ['qc:logging:validate', 'node scripts/qc/validate-journey-qc.mjs'],
  ['qc:manual-automation-gaps:validate', 'validate-manual-automation-gaps.mjs'],
  ['qc:surface-browser:validate', 'validate-surface-browser-proof.mjs'],
  ['qc:openspec-ci:validate', 'validate-openspec-ci-quality.mjs'],
  ['verify:app-completion', 'qc:app-completion'],
  ['verify:app-completion:release', 'qc:app-completion:release'],
  ['verify:app-completion:release-full', 'verify:qc:roadmap'],
  ['verify:qc', 'qc:lifecycle:status'],
  ['verify:qc:roadmap', 'qc:manual-automation-gaps:validate'],
  ['verify:rules', 'openspec validate --all --strict'],
  ['electron:test:build', 'test:build'],
  ['validate:combat:gaps', 'scripts/print-combat-validation-gaps.ts'],
  ['verify:qc:app-shell', 'e2e/app-shell-route-proof.spec.ts'],
  ['verify:qc:campaign-economy', 'verify:qc:campaign-economy:browser'],
  ['verify:qc:campaign-operations', 'CampaignOperationsQueueCard.test.tsx'],
  ['qc:campaign-long:browser', 'e2e/campaign-long-browser-signoff.spec.ts'],
  ['verify:qc:campaign-long', 'qc:campaign-long:browser'],
  ['qc:combat-4v4:validate', 'validate-combat-4v4-qc.mjs'],
  ['verify:qc:combat-4v4', 'combat4v4JourneyProof.test.ts'],
  ['verify:qc:gm:campaign-ledger', 'qc:gm:campaign-ledger:validate'],
  ['verify:qc:gm:time-cascade', 'qc:gm:time-cascade:validate'],
  ['qc:wave3:validate', 'validate-wave3-encounter-tactical.mjs'],
  ['verify:qc:wave3', 'qc:wave3:validate'],
  ['qc:wave4:validate', 'validate-wave4-scope-recovery.mjs'],
  ['qc:nonbattlemech:scope:validate', 'validate-nonbattlemech-scope-matrix.ts'],
  ['verify:qc:wave4', 'qc:wave4:validate'],
  ['verify:qc:multiplayer-reliability', 'verify:qc:multiplayer:browser'],
  ['qc:known-gaps:validate', 'validate-known-gap-honesty.mjs'],
  ['verify:qc:known-gaps', 'qc:known-gaps:validate'],
  ['verify:qc:journeys', 'qc:journeys'],
  ['verify:qc:ui-flow-shell', 'qc:ui-flow-shell'],
  ['verify:qc:maintenance', 'validate-maintenance-warning-ledger.mjs'],
]);

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

const priorityWaves = [
  {
    wave: 'Wave 1',
    label: 'App shell route, refresh, and deep-link proof',
    surfaces: ['app-shell-navigation'],
  },
  {
    wave: 'Wave 2',
    label: 'Browser campaign loop and GM ledger UI',
    surfaces: [
      'campaign-economy-progression',
      'long-campaign-stability',
      'post-combat-base-economy-gm-ledger',
      'time-cascade-gm-ledger',
    ],
  },
  {
    wave: 'Wave 3',
    label: 'Encounter continuity and tactical UX proof',
    surfaces: [
      'force-pilot-encounter-setup',
      'gameplay-tactical-map-combat',
      'tactical-map-rules-explanation',
      'topdown-hex-legibility',
      'movement-preview-engine-agreement',
      'combat-preview-engine-agreement',
      'isometric-rotatable-25d',
      'simulation-combat-validation',
      'behavior-class-combat-rules',
      'integration-runner-interactive-parity',
      'physical-weapon-runtime-boundary',
    ],
  },
  {
    wave: 'Wave 4',
    label: 'Customizer, non-BattleMech, multiplayer, and replay',
    surfaces: [
      'customizer-construction-bv-export',
      'compendium-unit-data',
      'non-battlemech-combat-scope-matrix',
      'multiplayer-coop-sync',
      'replay-audit-history',
    ],
  },
  {
    wave: 'Wave 5',
    label: 'Release reporter, Electron/security, and maintenance burn-down',
    surfaces: [
      'desktop-api-security',
      'openspec-ci-quality',
      'maintenance-code-health',
      'known-gap-honesty-audit',
    ],
  },
];

const releaseGapPattern =
  /release-grade|release[- ]signoff|signoff|browser-driven|browserExecuted=false|true two-window|packaged-runtime|security audit|explicit skips|separate UI lane|screenshot-quality|manual takeover|knownLimitations bypass/i;

const evidenceReleaseGapPattern =
  /release-grade|release[- ]signoff|signoff|browser-driven|browserExecuted=false|true two-window|packaged-runtime|security audit|explicit skips|separate UI lane|screenshot-quality|manual takeover/i;

function parseArgs(argv) {
  const options = {
    failOnReleaseGaps: false,
    json: false,
    paths: {
      packageJson:
        process.env.MEKSTATION_PACKAGE_JSON_PATH ?? defaultPaths.packageJson,
      registry:
        process.env.MEKSTATION_QC_REGISTRY_PATH ?? defaultPaths.registry,
      majorScenarios:
        process.env.MEKSTATION_MAJOR_SCENARIOS_PATH ??
        defaultPaths.majorScenarios,
      journeyScenarios:
        process.env.MEKSTATION_JOURNEY_SCENARIOS_PATH ??
        defaultPaths.journeyScenarios,
      loggingMap:
        process.env.MEKSTATION_LOGGING_MAP_PATH ?? defaultPaths.loggingMap,
      maintenanceLedger:
        process.env.MEKSTATION_MAINTENANCE_LEDGER_PATH ??
        defaultPaths.maintenanceLedger,
      openspecChanges:
        process.env.MEKSTATION_OPENSPEC_CHANGES_DIR ??
        defaultPaths.openspecChanges,
    },
  };

  for (const arg of argv) {
    if (arg === '--fail-on-release-gaps') {
      options.failOnReleaseGaps = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }

    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) continue;

    const [, key, value] = match;
    if (key === 'package') options.paths.packageJson = value;
    if (key === 'registry') options.paths.registry = value;
    if (key === 'major-scenarios') options.paths.majorScenarios = value;
    if (key === 'journey-scenarios') options.paths.journeyScenarios = value;
    if (key === 'logging-map') options.paths.loggingMap = value;
    if (key === 'maintenance-ledger') options.paths.maintenanceLedger = value;
    if (key === 'openspec-changes') options.paths.openspecChanges = value;
  }

  return options;
}

function resolveInputPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, '');
}

function loadJson(filePath) {
  const resolvedPath = resolveInputPath(filePath);
  return JSON.parse(stripBom(fs.readFileSync(resolvedPath, 'utf8')));
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function activeOpenSpecChanges(changesDirPath) {
  const changesDir = resolveInputPath(changesDirPath);
  if (!fs.existsSync(changesDir)) return [];

  return fs
    .readdirSync(changesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => entry.name)
    .sort();
}

function validateScripts(scripts, errors) {
  const found = [];

  for (const [scriptName, expectedNeedle] of requiredScripts) {
    const command = scripts[scriptName];
    if (typeof command !== 'string' || command.trim() === '') {
      errors.push(`missing package script: ${scriptName}`);
      continue;
    }
    if (!command.includes(expectedNeedle)) {
      errors.push(
        `${scriptName}: expected command to include "${expectedNeedle}"`,
      );
    }
    found.push(scriptName);
  }

  const verifyRules = scripts['verify:rules'] ?? '';
  if (!verifyRules.includes('--expect-total=0')) {
    errors.push('verify:rules must preserve zero unresolved combat gap gate');
  }
  if (!verifyRules.includes('--expect-total=148')) {
    errors.push('verify:rules must preserve non-BattleMech out-of-scope gate');
  }
  if (!verifyRules.includes('openspec validate --all --strict')) {
    errors.push('verify:rules must run strict OpenSpec validation');
  }

  const verifyAppCompletion = scripts['verify:app-completion'] ?? '';
  for (const scriptName of [
    'qc:app-completion',
    'verify:qc',
    'verify:rules',
    'electron:test:build',
  ]) {
    if (!verifyAppCompletion.includes(scriptName)) {
      errors.push(
        `verify:app-completion must include ${scriptName} in its gate chain`,
      );
    }
  }

  return found;
}

function validateRegistry(registry, errors) {
  const surfaces = Array.isArray(registry.surfaces) ? registry.surfaces : [];
  if (surfaces.length === 0) {
    errors.push('QC registry must contain surfaces');
  }

  const byId = new Map(surfaces.map((surface) => [surface.surfaceId, surface]));
  for (const surfaceId of requiredSurfaceIds) {
    if (!byId.has(surfaceId)) {
      errors.push(`QC registry missing required release surface: ${surfaceId}`);
    }
  }

  return { surfaces, byId };
}

function validateMajorScenarios(majorScenarios, errors) {
  const scenarios = Array.isArray(majorScenarios.scenarios)
    ? majorScenarios.scenarios
    : [];
  if (scenarios.length === 0) {
    errors.push('major capability scenarios must contain scenarios');
  }
  if (
    typeof majorScenarios.scenarioCount === 'number' &&
    majorScenarios.scenarioCount !== scenarios.length
  ) {
    errors.push(
      `major capability scenarioCount ${majorScenarios.scenarioCount} does not match scenarios length ${scenarios.length}`,
    );
  }

  const requiredChecks = scenarios
    .flatMap((scenario) => scenario.checks ?? [])
    .filter((check) => check.required);
  if (requiredChecks.length === 0) {
    errors.push('major capability scenarios must include required checks');
  }

  return { scenarios, requiredChecks };
}

function validateJourneyScenarios(journeyScenarios, errors) {
  const journeys = Array.isArray(journeyScenarios.journeys)
    ? journeyScenarios.journeys
    : [];
  if (journeys.length === 0) {
    errors.push('journey scenarios must contain journeys');
  }

  const byId = new Set(journeys.map((journey) => journey.id));
  for (const journeyId of journeyScenarios.requiredJourneyIds ?? []) {
    if (!byId.has(journeyId)) {
      errors.push(`journey scenarios missing required journey: ${journeyId}`);
    }
  }

  return journeys;
}

function validateLoggingMap(loggingMap, errors) {
  const paths = Array.isArray(loggingMap.paths) ? loggingMap.paths : [];
  if (paths.length === 0) {
    errors.push('logging map must contain paths');
  }

  const byId = new Set(paths.map((entry) => entry.pathId));
  for (const pathId of loggingMap.requiredPathIds ?? []) {
    if (!byId.has(pathId)) {
      errors.push(`logging map missing required path: ${pathId}`);
    }
  }
  if (
    !Array.isArray(loggingMap.requiredTriageFields) ||
    loggingMap.requiredTriageFields.length === 0
  ) {
    errors.push('logging map must define required triage fields');
  }

  return paths;
}

function validateMaintenanceLedger(ledger, errors) {
  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  if (entries.length === 0) {
    errors.push('maintenance ledger must contain entries');
  }
  if (!Array.isArray(ledger.categories) || ledger.categories.length === 0) {
    errors.push('maintenance ledger must define categories');
  }

  return entries;
}

function releaseGapsForSurface(surface) {
  const gaps = [];

  if (
    surface.coverageStatus &&
    !['complete', 'ready-with-scope'].includes(surface.coverageStatus)
  ) {
    gaps.push({
      surfaceId: surface.surfaceId,
      kind: 'coverage-status',
      detail: `coverageStatus=${surface.coverageStatus}`,
    });
  }

  for (const field of ['gaps', 'manualChecks', 'evidence']) {
    for (const value of surface[field] ?? []) {
      const pattern =
        field === 'evidence' ? evidenceReleaseGapPattern : releaseGapPattern;
      if (!pattern.test(String(value))) continue;
      gaps.push({
        surfaceId: surface.surfaceId,
        kind: field,
        detail: String(value).replace(/\s+/g, ' ').slice(0, 240),
      });
    }
  }

  return gaps;
}

function releaseGapsForScenarios(scenarios, journeys) {
  const gaps = [];

  for (const scenario of scenarios) {
    for (const value of [
      ...(scenario.successCriteria ?? []),
      ...(scenario.notes ?? []),
      ...(scenario.releaseGaps ?? []),
      ...(scenario.knownLimitations ?? []),
    ]) {
      if (!releaseGapPattern.test(String(value))) continue;
      gaps.push({
        surfaceId: scenario.surfaceId ?? scenario.id,
        kind: 'major-scenario',
        detail: String(value).replace(/\s+/g, ' ').slice(0, 240),
      });
    }
  }

  for (const journey of journeys) {
    for (const value of journey.knownLimitations ?? []) {
      if (!releaseGapPattern.test(String(value))) continue;
      gaps.push({
        surfaceId: journey.id,
        kind: 'journey-limitation',
        detail: String(value).replace(/\s+/g, ' ').slice(0, 240),
      });
    }

    for (const step of journey.steps ?? []) {
      if (step.required === false) continue;
      const proofCommands = step.executionProofCommands ?? [];
      const missingBacking =
        step.syntheticBacking !== false ||
        !step.executionBacking ||
        step.executionBacking === 'synthetic-projection';
      const missingProof =
        !Array.isArray(proofCommands) ||
        proofCommands.length === 0 ||
        proofCommands.some((command) => typeof command !== 'string');

      if (!missingBacking && !missingProof) continue;

      gaps.push({
        surfaceId: journey.surfaceIds?.[0] ?? journey.id,
        kind: 'journey-execution-backing',
        detail:
          `${journey.id}/${step.id} is required but release backing is incomplete ` +
          `(syntheticBacking=${String(step.syntheticBacking)} executionBacking=${String(step.executionBacking ?? 'missing')} proofCommands=${proofCommands.length}).`,
      });
    }
  }

  return gaps;
}

function summarizePriorityWaves(byId, releaseGaps) {
  const gapCounts = countBy(releaseGaps, (gap) => gap.surfaceId);

  return priorityWaves.map((wave) => {
    const surfaces = wave.surfaces
      .map((surfaceId) => byId.get(surfaceId))
      .filter(Boolean)
      .map((surface) => ({
        surfaceId: surface.surfaceId,
        coverageStatus: surface.coverageStatus,
        gapCount: gapCounts[surface.surfaceId] ?? 0,
      }));

    return {
      wave: wave.wave,
      label: wave.label,
      surfaces,
      releaseGapCount: surfaces.reduce(
        (total, surface) => total + surface.gapCount,
        0,
      ),
    };
  });
}

function buildReport(options) {
  const errors = [];

  const packageJson = loadJson(options.paths.packageJson);
  const registry = loadJson(options.paths.registry);
  const majorScenarios = loadJson(options.paths.majorScenarios);
  const journeyScenarios = loadJson(options.paths.journeyScenarios);
  const loggingMap = loadJson(options.paths.loggingMap);
  const maintenanceLedger = loadJson(options.paths.maintenanceLedger);

  const scriptsFound = validateScripts(packageJson.scripts ?? {}, errors);
  const { surfaces, byId } = validateRegistry(registry, errors);
  const { scenarios, requiredChecks } = validateMajorScenarios(
    majorScenarios,
    errors,
  );
  const journeys = validateJourneyScenarios(journeyScenarios, errors);
  const loggingPaths = validateLoggingMap(loggingMap, errors);
  const maintenanceEntries = validateMaintenanceLedger(
    maintenanceLedger,
    errors,
  );

  const openSpecChanges = activeOpenSpecChanges(options.paths.openspecChanges);
  const surfaceReleaseGaps = surfaces.flatMap(releaseGapsForSurface);
  const scenarioReleaseGaps = releaseGapsForScenarios(scenarios, journeys);
  const releaseGaps = [...surfaceReleaseGaps, ...scenarioReleaseGaps];
  const priority = summarizePriorityWaves(byId, releaseGaps);

  return {
    errors,
    releaseGaps,
    summary: {
      openSpec: {
        activeChanges: openSpecChanges.length,
        strictGateWired: scriptsFound.includes('verify:rules'),
      },
      scripts: {
        required: requiredScripts.size,
        found: scriptsFound.length,
      },
      qcRegistry: {
        surfaces: surfaces.length,
        coverageStatus: countBy(
          surfaces,
          (surface) => surface.coverageStatus ?? 'unknown',
        ),
        requiredSurfaces: requiredSurfaceIds.length,
      },
      lifecycle: {
        command: 'qc:lifecycle:status',
        wired: scriptsFound.includes('qc:lifecycle:status'),
      },
      majorScenarios: {
        scenarios: scenarios.length,
        requiredChecks: requiredChecks.length,
      },
      journeys: {
        journeys: journeys.length,
        knownLimitations: journeys.reduce(
          (total, journey) => total + (journey.knownLimitations?.length ?? 0),
          0,
        ),
      },
      logging: {
        paths: loggingPaths.length,
        severity: countBy(loggingPaths, (entry) => entry.severity ?? 'unknown'),
      },
      combatGaps: {
        zeroGateWired: (packageJson.scripts?.['verify:rules'] ?? '').includes(
          '--expect-total=0',
        ),
        outOfScopeGateWired: (
          packageJson.scripts?.['verify:rules'] ?? ''
        ).includes('--expect-total=148'),
      },
      electron: {
        packageCheckWired: scriptsFound.includes('electron:test:build'),
      },
      maintenance: {
        entries: maintenanceEntries.length,
        status: countBy(
          maintenanceEntries,
          (entry) => entry.status ?? 'unknown',
        ),
        category: countBy(
          maintenanceEntries,
          (entry) => entry.category ?? 'unknown',
        ),
      },
      releaseSignoff: {
        gaps: releaseGaps.length,
      },
    },
    priority,
  };
}

function formatCounts(counts) {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
}

function printReport(report, options) {
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const { summary } = report;

  console.log('# App completion readiness');
  console.log(
    `OpenSpec: activeChanges=${summary.openSpec.activeChanges} strictGateWired=${summary.openSpec.strictGateWired}`,
  );
  console.log(
    `Scripts: required=${summary.scripts.required} found=${summary.scripts.found}`,
  );
  console.log(
    `QC registry: surfaces=${summary.qcRegistry.surfaces} requiredSurfaces=${summary.qcRegistry.requiredSurfaces} ${formatCounts(summary.qcRegistry.coverageStatus)}`,
  );
  console.log(
    `Lifecycle: command=${summary.lifecycle.command} wired=${summary.lifecycle.wired}`,
  );
  console.log(
    `Major scenarios: scenarios=${summary.majorScenarios.scenarios} requiredChecks=${summary.majorScenarios.requiredChecks}`,
  );
  console.log(
    `Journeys: journeys=${summary.journeys.journeys} knownLimitations=${summary.journeys.knownLimitations}`,
  );
  console.log(
    `Logging: paths=${summary.logging.paths} ${formatCounts(summary.logging.severity)}`,
  );
  console.log(
    `Combat gaps: zeroGateWired=${summary.combatGaps.zeroGateWired} outOfScopeGateWired=${summary.combatGaps.outOfScopeGateWired}`,
  );
  console.log(
    `Electron: packageCheckWired=${summary.electron.packageCheckWired}`,
  );
  console.log(
    `Maintenance: entries=${summary.maintenance.entries} status(${formatCounts(summary.maintenance.status)}) category(${formatCounts(summary.maintenance.category)})`,
  );
  console.log(`Release signoff gaps: ${summary.releaseSignoff.gaps}`);

  for (const wave of report.priority) {
    const surfaceSummary = wave.surfaces
      .map(
        (surface) =>
          `${surface.surfaceId}:${surface.coverageStatus}/gaps=${surface.gapCount}`,
      )
      .join(', ');
    console.log(
      `${wave.wave}: ${wave.label}; releaseGaps=${wave.releaseGapCount}; ${surfaceSummary}`,
    );
  }

  const topGaps = report.releaseGaps.slice(0, 12);
  if (topGaps.length > 0) {
    console.log('Top release-signoff gap samples:');
    for (const gap of topGaps) {
      console.log(`- ${gap.surfaceId} [${gap.kind}]: ${gap.detail}`);
    }
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport(options);
  printReport(report, options);

  for (const error of report.errors) {
    console.error(`ERROR: ${error}`);
  }

  if (options.failOnReleaseGaps && report.releaseGaps.length > 0) {
    console.error(
      `ERROR: release signoff gaps remain: ${report.releaseGaps.length}`,
    );
  }

  const shouldFail =
    report.errors.length > 0 ||
    (options.failOnReleaseGaps && report.releaseGaps.length > 0);
  process.exit(shouldFail ? 1 : 0);
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
