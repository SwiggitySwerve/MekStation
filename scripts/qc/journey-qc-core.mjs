import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateJourneyCatalog as validateJourneyCatalogImplementation } from './journey-qc-catalog-validator.mjs';
import { validateValidationGraph as validateValidationGraphImplementation } from './journey-qc-graph-validator.mjs';
import { validateLoggingMap as validateLoggingMapImplementation } from './journey-qc-logging-validator.mjs';
import { validateUiFlowShell as validateUiFlowShellImplementation } from './journey-qc-ui-flow-validator.mjs';
import { executeRunPlan as executeRunPlanImplementation } from './journey-qc-run-executor.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, '..', '..');
export const journeyCatalogPath = process.env.MEKSTATION_JOURNEY_CATALOG_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_JOURNEY_CATALOG_PATH)
  : path.join(repoRoot, 'docs', 'qc', 'mekstation-journey-scenarios.json');
export const validationGraphPath = process.env
  .MEKSTATION_QC_VALIDATION_GRAPH_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_QC_VALIDATION_GRAPH_PATH)
  : path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-validation-graph.json');
export const loggingMapPath = process.env.MEKSTATION_QC_LOGGING_MAP_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_QC_LOGGING_MAP_PATH)
  : path.join(repoRoot, 'docs', 'qc', 'mekstation-logging-map.json');
export const qcRegistryPath = process.env.MEKSTATION_QC_REGISTRY_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_QC_REGISTRY_PATH)
  : path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json');
export const uiFlowShellPath = process.env.MEKSTATION_UI_FLOW_SHELL_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_UI_FLOW_SHELL_PATH)
  : path.join(repoRoot, 'src', 'qc', 'gameplayUiFlowShell.json');

export const requiredJourneyIds = [
  'character-build',
  'mek-build',
  'combat-1v1',
  'combat-4v4',
  'contract-campaign',
  'campaign-short',
  'campaign-long',
];

export const severityRank = {
  info: 0,
  warning: 1,
  warn: 1,
  medium: 2,
  high: 3,
  error: 3,
  critical: 4,
};

const allowedTiers = new Set(['smoke', 'standard', 'extended']);
const requiredCheckpointIdsByJourney = new Map([
  ['character-build', ['pilot-create', 'pilot-roster', 'force-assignment']],
  [
    'mek-build',
    ['customizer', 'unit-catalog', 'force-roster', 'campaign-mech-bay'],
  ],
  [
    'combat-1v1',
    [
      'quick-setup',
      'encounter-create',
      'pre-battle',
      'tactical-combat',
      'gm-review',
      'victory',
    ],
  ],
  [
    'combat-4v4',
    [
      'force-build',
      'encounter-create',
      'pre-battle',
      'tactical-combat',
      'gm-review',
      'replay',
    ],
  ],
  [
    'contract-campaign',
    [
      'campaign-base',
      'contract-market',
      'mission-launch',
      'tactical-combat',
      'post-combat',
      'salvage',
      'repair',
      'economy',
      'gm-log',
    ],
  ],
  [
    'campaign-short',
    [
      'campaign-base',
      'starmap',
      'contracts',
      'missions',
      'repair',
      'personnel',
      'finances',
      'campaign-log',
    ],
  ],
  [
    'campaign-long',
    [
      'campaign-base',
      'starmap',
      'medical',
      'salvage',
      'repair',
      'finances',
      'campaign-log',
    ],
  ],
]);

export function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll('\\', '/');
}

export function loadJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function parseArgs(argv) {
  const options = {
    continueOnError: false,
    dryRun: false,
    failOnBugSeverity: 'medium',
    journey: 'all',
    mode: null,
    requireDomainBacked: false,
    runs: 1,
    seed: 42,
    tier: 'standard',
  };
  const parameters = {};
  const booleanFlags = new Set([
    '--continue-on-error',
    '--dry-run',
    '--list',
    '--json',
    '--validate-only',
    '--exclude-probes',
    '--actionable-only',
    '--require-domain-backed',
    '--require-non-synthetic-backing',
  ]);
  const booleanFlagHandlers = new Map([
    ['--continue-on-error', () => { options.continueOnError = true; }],
    ['--dry-run', () => { options.dryRun = true; }],
    ['--list', () => { options.dryRun = true; }],
    ['--json', () => { options.json = true; }],
    ['--validate-only', () => { options.validateOnly = true; }],
    ['--exclude-probes', () => { options.excludeProbes = true; }],
    ['--actionable-only', () => { options.actionableOnly = true; }],
    ['--require-domain-backed', () => { options.requireDomainBacked = true; }],
    ['--require-non-synthetic-backing', () => { options.requireDomainBacked = true; }],
  ]);
  const valueHandlers = new Map([
    ['journey', (value) => { options.journey = value; }],
    ['tier', (value) => { options.tier = value; }],
    ['mode', (value) => { options.mode = value; }],
    ['seed', (value) => { options.seed = Number.parseInt(value, 10); }],
    ['runs', (value) => { options.runs = Number.parseInt(value, 10); }],
    ['run-id', (value) => { options.runId = value; }],
    ['evidence-dir', (value) => { options.evidenceDir = value; }],
    ['fail-on-bug-severity', (value) => { options.failOnBugSeverity = value; }],
    ['since', (value) => { options.since = value; }],
    ['run-id-filter', (value) => { options.runIdFilter = value; }],
    ['min-severity', (value) => { options.minSeverity = value; }],
    ['level', (value) => { options.level = value; }],
    ['classification', (value) => { options.classification = value; }],
    ['blocking', (value) => { options.blocking = value; }],
    ['service', (value) => { options.service = value; }],
    ['event', (value) => { options.event = value; }],
    ['step-id', (value) => { options.stepId = value; }],
    ['fingerprint', (value) => { options.fingerprint = value; }],
    ['module', (value) => { options.module = value; }],
    ['query', (value) => { options.query = value; }],
    ['kind', (value) => { options.kind = value; }],
    ['inject-failure', (value) => { options.injectFailure = value; }],
    ['inject-stability-drift', (value) => { options.injectStabilityDrift = value; }],
    ['inject-drift', (value) => { options.injectStabilityDrift = value; }],
  ]);

  for (const arg of argv) {
    if (booleanFlags.has(arg)) {
      booleanFlagHandlers.get(arg)();
      continue;
    }

    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = rawValue.trim();
    const assign = valueHandlers.get(key);
    if (assign) {
      assign(value);
      continue;
    }
    parameters[key] = value;
  }

  options.parameters = parameters;
  return options;
}

export function loadJourneyArtifacts() {
  return {
    catalog: loadJsonFile(journeyCatalogPath),
    graph: loadJsonFile(validationGraphPath),
    loggingMap: loadJsonFile(loggingMapPath),
    registry: loadJsonFile(qcRegistryPath),
    uiFlowShell: loadJsonFile(uiFlowShellPath),
  };
}

function issue(severity, message) {
  return { severity, message };
}

export function validateJourneyCatalog(catalog) {
  return validateJourneyCatalogImplementation(catalog, requiredJourneyIds);
}

export function validateCommandScreenCheckpointCoverage(catalog, uiFlowShell) {
  const issues = [];
  if (!Array.isArray(catalog.journeys) || !Array.isArray(uiFlowShell.flows)) {
    return issues;
  }

  const flowByJourneyId = new Map(
    uiFlowShell.flows.map((flow) => [flow.journeyId, flow]),
  );
  for (const journey of catalog.journeys) {
    const flow = flowByJourneyId.get(journey.id);
    if (!flow || !Array.isArray(journey.commandScreenCheckpoints)) continue;
    const uiCheckpointIds = new Set(
      (flow.checkpoints ?? []).map((checkpoint) => checkpoint.id),
    );
    for (const checkpoint of journey.commandScreenCheckpoints) {
      if (!uiCheckpointIds.has(checkpoint.uiCheckpointId)) {
        issues.push(
          issue(
            'error',
            `Journey ${journey.id}: command checkpoint ${checkpoint.id} references missing UI checkpoint ${checkpoint.uiCheckpointId}.`,
          ),
        );
      }
    }
  }

  return issues;
}

export function validateValidationGraph(graph, catalog, registry = null) {
  return validateValidationGraphImplementation(graph, catalog, registry);
}

export function validateLoggingMap(loggingMap, catalog, graph = null) {
  return validateLoggingMapImplementation(loggingMap, catalog, graph);
}

export function validateUiFlowShell(uiFlowShell, catalog, graph) {
  return validateUiFlowShellImplementation(uiFlowShell, catalog, graph, {
    repoRoot,
    toRepoRelative,
    requiredJourneyIds,
    requiredCheckpointIdsByJourney,
  });
}

export function buildUiFlowShellInspection(
  uiFlowShell,
  catalog,
  graph,
  options,
) {
  const issues = validateUiFlowShell(uiFlowShell, catalog, graph);
  const selectedJourneyId = options?.journey ?? 'all';
  const selectedFlows =
    selectedJourneyId === 'all'
      ? uiFlowShell.flows
      : uiFlowShell.flows.filter(
          (flow) => flow.journeyId === selectedJourneyId,
        );
  const journeyById = new Map(
    catalog.journeys.map((journey) => [journey.id, journey]),
  );
  if (selectedJourneyId !== 'all' && selectedFlows.length === 0) {
    issues.push(
      issue(
        'error',
        `UI flow shell has no flow for requested journey ${selectedJourneyId}.`,
      ),
    );
  }

  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');
  return {
    version: 1,
    status: errors.length > 0 ? 'fail' : 'pass',
    selectedJourneyId,
    sourceCatalog: uiFlowShell.sourceCatalog,
    sourceGraph: uiFlowShell.sourceGraph,
    flowCount: uiFlowShell.flows.length,
    selectedFlowCount: selectedFlows.length,
    issues,
    errors,
    warnings,
    flows: selectedFlows.map((flow) => ({
      journeyId: flow.journeyId,
      displayName: flow.displayName,
      module: flow.module,
      roleIntent: flow.roleIntent,
      primaryAction: flow.primaryAction,
      qcCommand: flow.qcCommand,
      checkpointCount: flow.checkpoints.length,
      checkpointIds: flow.checkpoints.map((checkpoint) => checkpoint.id),
      checkpoints: flow.checkpoints.map((checkpoint) => ({
        id: checkpoint.id,
        label: checkpoint.label,
        href: checkpoint.href,
        visibility: checkpoint.visibility,
      })),
      commandScreenCheckpoints:
        journeyById.get(flow.journeyId)?.commandScreenCheckpoints ?? [],
      inspectionNotes: flow.inspectionNotes,
    })),
  };
}

export function printIssues(issues) {
  for (const item of issues) {
    const prefix = item.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`${prefix}: ${item.message}`);
  }
}

export function validationSummary() {
  const { catalog, graph, loggingMap, registry, uiFlowShell } =
    loadJourneyArtifacts();
  const catalogIssues = validateJourneyCatalog(catalog);
  const graphIssues = validateValidationGraph(graph, catalog, registry);
  const loggingIssues = validateLoggingMap(loggingMap, catalog, graph);
  const uiFlowIssues = validateUiFlowShell(uiFlowShell, catalog, graph);
  const commandScreenIssues = validateCommandScreenCheckpointCoverage(
    catalog,
    uiFlowShell,
  );
  const issues = [
    ...catalogIssues,
    ...graphIssues,
    ...loggingIssues,
    ...uiFlowIssues,
    ...commandScreenIssues,
  ];
  return {
    catalog,
    graph,
    issues,
    loggingMap,
    registry,
    uiFlowShell,
    errors: issues.filter((item) => item.severity === 'error'),
    warnings: issues.filter((item) => item.severity === 'warning'),
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function diagnosticFingerprint(entry) {
  return hashString(`${entry.service}:${entry.event}:${entry.message ?? ''}`);
}

function coerceParameter(definition, rawValue) {
  if (rawValue === undefined) return definition.default;
  if (definition.type === 'integer') return Number.parseInt(rawValue, 10);
  if (definition.type === 'boolean') return rawValue === 'true';
  if (definition.type === 'string-list') {
    return String(rawValue)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return rawValue;
}

function formatParameterValue(value) {
  if (Array.isArray(value)) return value.join(',');
  return String(value);
}

function parameterError(journey, name, rawValue, expected) {
  return new Error(
    `${journey.id}: invalid parameter ${name}=${formatParameterValue(rawValue)}; expected ${expected}.`,
  );
}

function validateIntegerParameter(journey, name, definition, rawValue, value, rawLabel) {
  if (rawValue !== undefined && !/^-?\d+$/.test(String(rawValue).trim())) {
    throw parameterError(journey, name, rawValue, 'an integer');
  }
  if (!Number.isInteger(value)) {
    throw parameterError(journey, name, rawLabel, 'an integer');
  }
  if (definition.minimum !== undefined && value < definition.minimum) {
    throw parameterError(journey, name, rawLabel, `an integer >= ${definition.minimum}`);
  }
  if (definition.maximum !== undefined && value > definition.maximum) {
    throw parameterError(journey, name, rawLabel, `an integer <= ${definition.maximum}`);
  }
}

function validateBooleanParameter(journey, name, definition, rawValue, value, rawLabel) {
  if (rawValue !== undefined && rawValue !== 'true' && rawValue !== 'false') {
    throw parameterError(journey, name, rawValue, 'true or false');
  }
  if (typeof value !== 'boolean') {
    throw parameterError(journey, name, rawLabel, 'true or false');
  }
}

function validateEnumParameter(journey, name, definition, rawValue, value, rawLabel) {
  if (!Array.isArray(definition.values) || !definition.values.includes(value)) {
    throw parameterError(journey, name, rawLabel, `one of ${definition.values.join(', ')}`);
  }
}

function validateStringListParameter(journey, name, definition, rawValue, value, rawLabel) {
  if (!Array.isArray(value)) {
    throw parameterError(journey, name, rawLabel, 'a comma-separated list');
  }
  if (rawValue !== undefined && value.length === 0) {
    throw parameterError(journey, name, rawValue, 'a non-empty comma-separated list');
  }
}

function validateStringParameter(journey, name, definition, rawValue, value, rawLabel) {
  if (typeof value !== 'string') {
    throw parameterError(journey, name, rawLabel, 'a string');
  }
}

const parameterValidators = {
  integer: validateIntegerParameter,
  boolean: validateBooleanParameter,
  enum: validateEnumParameter,
  'string-list': validateStringListParameter,
  string: validateStringParameter,
};

function validateAndCoerceParameter(journey, name, definition, rawValue) {
  const value = coerceParameter(definition, rawValue);
  const rawLabel = rawValue === undefined ? definition.default : rawValue;
  parameterValidators[definition.type]?.(
    journey,
    name,
    definition,
    rawValue,
    value,
    rawLabel,
  );
  return value;
}

function validateKnownParameterOverrides(selectedJourneys, overrides) {
  const knownNames = new Set(
    selectedJourneys.flatMap((journey) => Object.keys(journey.parameters)),
  );
  for (const name of Object.keys(overrides ?? {})) {
    if (!knownNames.has(name)) {
      const journeyIds = selectedJourneys
        .map((journey) => journey.id)
        .join(', ');
      throw new Error(
        `Unknown journey parameter ${name} for selected journey(s): ${journeyIds}.`,
      );
    }
  }
}

function resolveParameters(journey, overrides) {
  const resolved = {};
  for (const [name, definition] of Object.entries(journey.parameters)) {
    resolved[name] = validateAndCoerceParameter(
      journey,
      name,
      definition,
      overrides[name],
    );
  }
  return resolved;
}

function selectJourneys(catalog, journeyOption) {
  const requested =
    !journeyOption || journeyOption === 'all'
      ? requiredJourneyIds
      : journeyOption
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
  const byId = new Map(
    catalog.journeys.map((journey) => [journey.id, journey]),
  );
  return requested.map((id) => {
    const journey = byId.get(id);
    if (!journey) throw new Error(`Unknown journey: ${id}`);
    return journey;
  });
}

function stepExecutionBacking(step) {
  return {
    executionBacking: step.executionBacking ?? 'synthetic-projection',
    syntheticBacking: step.syntheticBacking !== false,
    executionEvidenceSource:
      step.executionEvidenceSource ?? 'journey-catalog-projection',
    executionProofCommands: step.executionProofCommands ?? [],
  };
}

export function materializeRunPlan(catalog, options) {
  if (!allowedTiers.has(options.tier))
    throw new Error(`Invalid tier: ${options.tier}`);
  if (!Number.isInteger(options.seed))
    throw new Error('--seed must be an integer.');
  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new Error('--runs must be an integer >= 1.');
  }
  const selected = selectJourneys(catalog, options.journey);
  validateKnownParameterOverrides(selected, options.parameters);
  const timestamp = new Date().toISOString();
  const runId =
    options.runId ??
    `journey-${timestamp.replaceAll(':', '-').replaceAll('.', '-')}-${options.seed}`;
  const evidenceDir = path.resolve(
    repoRoot,
    options.evidenceDir ?? catalog.evidenceDir,
  );

  return {
    version: 1,
    runId,
    createdAt: timestamp,
    catalogVersion: catalog.version,
    catalogPath: toRepoRelative(journeyCatalogPath),
    dryRun: options.dryRun,
    tier: options.tier,
    mode: options.mode ?? 'catalog-default',
    requireDomainBacked: options.requireDomainBacked,
    seed: options.seed,
    runs: options.runs,
    evidenceDir: toRepoRelative(path.join(evidenceDir, runId)),
    failOnBugSeverity: options.failOnBugSeverity,
    journeyIds: selected.map((journey) => journey.id),
    journeys: selected.map((journey) => ({
      id: journey.id,
      displayName: journey.displayName,
      module: journey.module,
      mode: options.mode ?? journey.defaultMode,
      expectedTerminalState: journey.expectedTerminalState,
      resolvedParameters: resolveParameters(journey, options.parameters ?? {}),
      steps: journey.steps.map((step) => ({
        id: step.id,
        title: step.title,
        kind: step.kind,
        required: step.required !== false,
        diagnosticEvent: step.diagnosticEvent,
        loggingPathId: step.loggingPathId,
        produces: step.produces,
        ...stepExecutionBacking(step),
      })),
      knownLimitations: journey.knownLimitations ?? [],
    })),
  };
}

function serviceForStep(journey, step) {
  if (step.kind.startsWith('campaign')) return 'journey.campaign';
  if (
    step.kind.startsWith('combat') ||
    step.kind.startsWith('tactical') ||
    step.kind === 'replay-persistence'
  ) {
    return 'journey.combat';
  }
  if (step.kind.startsWith('mek')) return 'journey.mek';
  if (step.kind.startsWith('character')) return 'journey.character';
  if (step.kind === 'artifact-validation') return 'journey.persistence';
  return `journey.${journey.module}`;
}

function logEntry({
  level = 'info',
  service,
  event,
  message,
  runPlan,
  journey,
  step,
  attempt,
  classification,
  blocking,
  metadata,
}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    event,
    message,
    ...(classification ? { classification } : {}),
    ...(typeof blocking === 'boolean' ? { blocking } : {}),
    runId: runPlan.runId,
    journeyId: journey?.id,
    stepId: step?.id,
    entityIds: {
      attempt: String(attempt),
      ...(journey ? { module: journey.module } : {}),
    },
    metadata: metadata ?? {},
  };
  return {
    ...entry,
    fingerprint: diagnosticFingerprint(entry),
  };
}

function artifactPayload({ runPlan, journey, step, attempt }) {
  const idBase = hashString(
    `${runPlan.seed}:${journey.id}:${step.id}:${attempt}`,
  );
  const parameters = journey.resolvedParameters;
  const common = {
    runId: runPlan.runId,
    journeyId: journey.id,
    stepId: step.id,
    attempt,
    generatedId: idBase,
    executionBacking: step.executionBacking,
    syntheticBacking: step.syntheticBacking,
    executionEvidenceSource: step.executionEvidenceSource,
    executionProofCommands: step.executionProofCommands,
    parameters,
  };

  if (step.kind === 'character-generation') {
    return {
      ...common,
      pilotCount: parameters['pilot-count'],
      skillBand: parameters['pilot-skill-band'],
      abilities: parameters['pilot-abilities'],
      characters: Array.from(
        { length: parameters['pilot-count'] },
        (_, index) => ({
          id: `pilot-${idBase}-${index + 1}`,
          callsign: `QC-${index + 1}`,
          gunnery: parameters['pilot-skill-band'] === 'elite' ? 2 : 4,
          piloting: parameters['pilot-skill-band'] === 'green' ? 6 : 5,
        }),
      ),
    };
  }

  if (step.kind === 'mek-input-generation' || step.kind === 'mek-export') {
    return {
      ...common,
      unitType: parameters['unit-type'],
      chassis: parameters.chassis,
      variant: parameters.variant,
      era: parameters.era,
      unitTechBase: parameters.unitTechBase,
      weightClass: parameters['weight-class'],
      validationSummary: { errors: 0, warnings: 0 },
    };
  }

  if (step.kind === 'combat-encounter' || step.kind === 'combat-resolution') {
    return {
      ...common,
      playerUnits: parameters['player-units'],
      opponentUnits: parameters['opponent-units'],
      bvBudget: parameters['bv-budget'],
      mapRadius: parameters['map-radius'],
      terrain: parameters.terrain,
      turnLimit: parameters['turn-limit'],
      actions: ['movement-preview', 'attack-resolution'],
      terminalState: 'combat-complete',
    };
  }

  if (step.kind === 'tactical-rejection') {
    return {
      ...common,
      rejectedAction: 'move-through-blocked-hex',
      reason:
        'Destination is blocked by occupied terrain in the generated test plan.',
      nonColorIndicators: ['blocked-icon', 'reason-text'],
    };
  }

  if (step.kind === 'replay-persistence') {
    return {
      ...common,
      replayId: `replay-${idBase}`,
      matchLogId: `match-${idBase}`,
      artifactRefs: [
        'artifacts/combat-summary.json',
        'artifacts/match-log.json',
      ],
    };
  }

  if (step.kind === 'campaign-contract' || step.kind === 'campaign-sequence') {
    const contracts = parameters.contracts ?? 1;
    return {
      ...common,
      contracts: Array.from({ length: contracts }, (_, index) => ({
        id: `contract-${idBase}-${index + 1}`,
        type: (parameters['contract-types'] ?? ['battle'])[
          index % (parameters['contract-types'] ?? ['battle']).length
        ],
        daysUntilStart: index * (parameters['advance-days-between'] ?? 0),
      })),
    };
  }

  if (step.kind === 'campaign-resolution' || step.kind === 'campaign-economy') {
    const contracts = parameters.contracts ?? 1;
    return {
      ...common,
      contractsResolved: contracts,
      fundsDelta: contracts * 75000,
      salvagePolicy: parameters['salvage-policy'],
      repairPolicy: parameters['repair-policy'],
      terminalState: journey.expectedTerminalState,
    };
  }

  return common;
}

function actorForStep(journey, step) {
  if (step.kind === 'tactical-rejection') return 'player-side-a';
  if (step.kind === 'combat-resolution') return 'combat-engine';
  if (step.kind === 'combat-encounter') return 'encounter-generator';
  if (step.kind.startsWith('campaign')) return 'campaign-runner';
  if (step.kind.startsWith('mek')) return 'construction-runner';
  if (step.kind.startsWith('character')) return 'roster-runner';
  return `${journey.module}-journey-runner`;
}

function actionForStep(step, payload) {
  if (payload.rejectedAction) return payload.rejectedAction;
  if (Array.isArray(payload.actions) && payload.actions.length > 0) {
    return payload.actions.join(',');
  }
  return step.kind;
}

function compactStateBefore(journey, step, payload, attempt) {
  return {
    journeyId: journey.id,
    stepId: step.id,
    attempt,
    module: journey.module,
    expectedTerminalState: journey.expectedTerminalState,
    parameterHash: hashString(JSON.stringify(payload.parameters ?? {})),
  };
}

function compactStateAfter(step, payload, artifacts, status) {
  return {
    status,
    terminalState: payload.terminalState ?? null,
    artifactCount: artifacts.length,
    executionBacking: step.executionBacking,
    syntheticBacking: step.syntheticBacking,
    executionEvidenceSource: step.executionEvidenceSource,
  };
}

function ruleDecisionForStep(step, payload, shouldFail, failureMessage) {
  if (shouldFail) {
    return {
      outcome: 'blocked',
      source: 'journey-qc',
      reason: failureMessage,
    };
  }
  if (step.kind === 'tactical-rejection') {
    return {
      outcome: 'rejected',
      source: step.executionEvidenceSource,
      reason: payload.reason,
    };
  }
  return {
    outcome: 'accepted',
    source: step.executionEvidenceSource,
    reason: step.syntheticBacking
      ? 'Journey step satisfied its synthetic evidence assertion.'
      : 'Journey step satisfied its command-backed evidence contract.',
  };
}

function warningsForStep(step, payload, failureKind) {
  if (failureKind === 'missing-required-execution-backing') {
    return ['Synthetic backing does not satisfy --require-domain-backed.'];
  }
  if (step.kind === 'tactical-rejection' && payload.reason) {
    return [payload.reason];
  }
  return [];
}

function nextDebuggingHintForStep(journey, step, failureKind) {
  if (failureKind === 'missing-required-execution-backing') {
    return `Replace ${journey.id}/${step.id} with a domain, browser, or hybrid adapter before using --require-domain-backed as a release gate.`;
  }
  if (failureKind) {
    return `Inspect ${journey.id}/${step.id} artifacts and system.ndjson for the failing diagnostic.`;
  }
  if (step.kind === 'tactical-rejection') {
    return `Inspect the tactical rejection artifact for ${journey.id}/${step.id} and compare it to the engine projection reason.`;
  }
  return `Inspect ${journey.id}/${step.id} artifacts for the generated evidence summary.`;
}

function triageContext({
  journey,
  step,
  attempt,
  payload,
  artifacts,
  status,
  event,
  failureKind,
  failureMessage,
}) {
  return {
    actor: actorForStep(journey, step),
    action: actionForStep(step, payload),
    stateBefore: compactStateBefore(journey, step, payload, attempt),
    stateAfter: compactStateAfter(step, payload, artifacts, status),
    ruleDecision: ruleDecisionForStep(
      step,
      payload,
      status === 'fail',
      failureMessage,
    ),
    validationResult: {
      status,
      event,
      required: step.required !== false,
      ...(failureKind ? { failureKind } : {}),
    },
    warnings: warningsForStep(step, payload, failureKind),
    ...(failureMessage ? { failureCause: failureMessage } : {}),
    evidenceRefs: artifacts,
    nextDebuggingHint: nextDebuggingHintForStep(journey, step, failureKind),
  };
}

function writeArtifact(runDir, relativePath, payload) {
  const filePath = path.join(runDir, relativePath);
  writeJsonFile(filePath, payload);
  return toRepoRelative(filePath);
}

function backingSummary(journeys) {
  let totalSteps = 0;
  let syntheticSteps = 0;
  let nonSyntheticSteps = 0;
  let missingRequiredBacking = 0;
  for (const journey of journeys) {
    for (const attempt of journey.attempts ?? []) {
      for (const step of attempt.steps ?? []) {
        totalSteps += 1;
        if (step.syntheticBacking) syntheticSteps += 1;
        else nonSyntheticSteps += 1;
        if (step.failureKind === 'missing-required-execution-backing') {
          missingRequiredBacking += 1;
        }
      }
    }
  }
  return {
    totalSteps,
    syntheticSteps,
    nonSyntheticSteps,
    missingRequiredBacking,
  };
}

function severityMeets(candidateSeverity, minimumSeverity) {
  return (
    (severityRank[candidateSeverity] ?? 0) >=
    (severityRank[minimumSeverity] ?? 0)
  );
}

function uniqueList(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function triageCompletenessScore(triage) {
  if (!triage) return 0;
  return [
    'actor',
    'action',
    'stateBefore',
    'stateAfter',
    'ruleDecision',
    'validationResult',
    'failureCause',
    'nextDebuggingHint',
  ].reduce((score, field) => score + (triage[field] ? 1 : 0), 0);
}

function bugDedupeKey(bug) {
  return [
    bug.runId ?? '-',
    bug.journeyId ?? '-',
    bug.stepId ?? '-',
    bug.triage?.failureCause ?? bug.summary ?? bug.fingerprint ?? '-',
  ].join('|');
}

function mergeTriage(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const preferred =
    triageCompletenessScore(incoming) > triageCompletenessScore(existing)
      ? incoming
      : existing;
  const secondary = preferred === incoming ? existing : incoming;
  return {
    ...secondary,
    ...preferred,
    warnings: uniqueList([
      ...(secondary.warnings ?? []),
      ...(preferred.warnings ?? []),
    ]),
    evidenceRefs: uniqueList([
      ...(secondary.evidenceRefs ?? []),
      ...(preferred.evidenceRefs ?? []),
    ]),
    logFingerprints: uniqueList([
      ...(secondary.logFingerprints ?? []),
      ...(preferred.logFingerprints ?? []),
    ]),
  };
}

function mergeBugCandidates(existing, incoming) {
  const existingRank = severityRank[existing.severity] ?? 0;
  const incomingRank = severityRank[incoming.severity] ?? 0;
  const preferred = incomingRank > existingRank ? incoming : existing;
  const secondary = preferred === incoming ? existing : incoming;
  return {
    ...secondary,
    ...preferred,
    evidenceRefs: uniqueList([
      ...(secondary.evidenceRefs ?? []),
      ...(preferred.evidenceRefs ?? []),
    ]),
    triage: mergeTriage(secondary.triage, preferred.triage),
  };
}

function dedupeBugCandidates(bugs) {
  const byKey = new Map();
  for (const bug of bugs) {
    const key = bugDedupeKey(bug);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeBugCandidates(existing, bug) : bug);
  }
  return [...byKey.values()];
}

function groupLogsByStep(logs) {
  const logsByStep = new Map();
  for (const entry of logs) {
    if (!entry.journeyId || !entry.stepId) continue;
    const key = `${entry.journeyId}/${entry.stepId}`;
    const entries = logsByStep.get(key) ?? [];
    entries.push(entry);
    logsByStep.set(key, entries);
  }
  return logsByStep;
}

function triageFromLogs(logsByStep, journeyId, stepId) {
  const matchingLogs = logsByStep.get(`${journeyId}/${stepId}`) ?? [];
  const triage = matchingLogs.find((entry) => entry.metadata?.triage)?.metadata?.triage;
  if (!triage) return undefined;
  return {
    ...triage,
    logFingerprints: matchingLogs.map(
      (entry) => entry.fingerprint ?? diagnosticFingerprint(entry),
    ),
  };
}

function journeyFailureCandidates(result, logsByStep) {
  const bugs = [];
  for (const journey of result.journeys ?? []) {
    for (const attempt of journey.attempts ?? []) {
      for (const step of attempt.steps ?? []) {
        if (step.status === 'pass') continue;
        const triage = triageFromLogs(logsByStep, journey.id, step.id);
        const summary =
          step.failureKind === 'missing-required-execution-backing'
            ? `Missing non-synthetic execution backing: ${journey.id}/${step.id}`
            : `Journey step failed: ${journey.id}/${step.id}`;
        bugs.push({
          severity: 'high',
          journeyId: journey.id,
          runId: result.runId,
          stepId: step.id,
          module: journey.module,
          fingerprint: hashString(
            `${journey.id}:${step.id}:${step.status}:${step.failureKind ?? ''}:${step.error ?? ''}`,
          ),
          summary,
          evidenceRefs: [
            ...(step.artifacts ?? []),
            ...(triage?.logFingerprints ?? []).map(
              (fingerprint) => `system.ndjson#${fingerprint}`,
            ),
          ],
          ...(triage ? { triage } : {}),
        });
      }
      if (attempt.terminalState === journey.expectedTerminalState) continue;
      bugs.push({
        severity: 'high',
        journeyId: journey.id,
        runId: result.runId,
        stepId: null,
        module: journey.module,
        fingerprint: hashString(`${journey.id}:missing-terminal-state`),
        summary: `Missing terminal state for ${journey.id}`,
        evidenceRefs: [],
      });
    }
  }
  return bugs;
}

function errorLogCandidates(logs) {
  return logs.filter((entry) => entry.level === 'error').map((entry) => {
    const fingerprint = entry.fingerprint ?? diagnosticFingerprint(entry);
    const triage = entry.metadata?.triage
      ? { ...entry.metadata.triage, logFingerprints: [fingerprint] }
      : undefined;
    return {
      severity: 'medium',
      journeyId: entry.journeyId,
      runId: entry.runId,
      stepId: entry.stepId,
      module: entry.entityIds?.module,
      fingerprint,
      summary: entry.message ?? `${entry.service}.${entry.event}`,
      evidenceRefs: [`system.ndjson#${fingerprint}`],
      ...(triage ? { triage } : {}),
    };
  });
}

export function extractBugCandidates(result, logs) {
  return dedupeBugCandidates([
    ...journeyFailureCandidates(result, groupLogsByStep(logs)),
    ...errorLogCandidates(logs),
  ]);
}

export function executeRunPlan(runPlan, options = {}) {
  return executeRunPlanImplementation(runPlan, options, {
    resolveRunDir: (evidenceDir) => path.resolve(repoRoot, evidenceDir),
    artifactPayload,
    writeArtifact,
    triageContext,
    logEntry,
    serviceForStep,
    backingSummary,
  });
}

export function writeEvidenceBundle(runPlan, result, logs, bugs) {
  const runDir = path.resolve(repoRoot, runPlan.evidenceDir);
  fs.mkdirSync(path.join(runDir, 'stdout'), { recursive: true });
  fs.mkdirSync(path.join(runDir, 'stderr'), { recursive: true });
  fs.mkdirSync(path.join(runDir, 'artifacts'), { recursive: true });
  fs.mkdirSync(path.join(runDir, 'generated'), { recursive: true });

  writeJsonFile(path.join(runDir, 'run-plan.json'), runPlan);
  writeJsonFile(path.join(runDir, 'result.json'), result);
  writeJsonFile(path.join(runDir, 'bugs.json'), bugs);
  fs.writeFileSync(
    path.join(runDir, 'system.ndjson'),
    logs.map((entry) => JSON.stringify(entry)).join('\n') +
      (logs.length ? '\n' : ''),
  );
  fs.writeFileSync(
    path.join(runDir, 'stdout', 'runner.log'),
    `[qc:journeys] ${result.status}\n`,
  );
  fs.writeFileSync(path.join(runDir, 'stderr', 'runner.log'), '');
  fs.writeFileSync(
    path.join(runDir, 'report.md'),
    renderReport(runPlan, result, logs, bugs),
  );

  const latestPath = path.join(path.dirname(runDir), 'latest.json');
  writeJsonFile(latestPath, {
    runId: runPlan.runId,
    runDir: toRepoRelative(runDir),
    result: toRepoRelative(path.join(runDir, 'result.json')),
    bugs: toRepoRelative(path.join(runDir, 'bugs.json')),
    logs: toRepoRelative(path.join(runDir, 'system.ndjson')),
  });

  return {
    runDir: toRepoRelative(runDir),
    latestPath: toRepoRelative(latestPath),
  };
}

function renderReport(runPlan, result, logs, bugs) {
  const expectedProbeCount = logs.filter(
    (entry) => entry.classification === 'expected-probe',
  ).length;
  const actionableWarningCount = logs.filter(
    (entry) =>
      entry.level === 'warn' && entry.classification !== 'expected-probe',
  ).length;
  const blockingLogCount = logs.filter(
    (entry) => entry.blocking === true,
  ).length;
  const lines = [
    `# Journey QC Run ${runPlan.runId}`,
    '',
    `- Status: ${result.status}`,
    `- Tier: ${runPlan.tier}`,
    `- Mode: ${runPlan.mode}`,
    `- Seed: ${runPlan.seed}`,
    `- Runs: ${runPlan.runs}`,
    `- Require domain-backed: ${runPlan.requireDomainBacked ? 'yes' : 'no'}`,
    `- Bugs: ${bugs.length}`,
    `- Synthetic-backed steps: ${result.executionBackingSummary?.syntheticSteps ?? 0}/${result.executionBackingSummary?.totalSteps ?? 0}`,
    `- Missing required backing: ${result.executionBackingSummary?.missingRequiredBacking ?? 0}`,
    `- Expected probes: ${expectedProbeCount}`,
    `- Actionable/diagnostic warnings: ${actionableWarningCount}`,
    `- Blocking log entries: ${blockingLogCount}`,
    '',
    '## Journeys',
    '',
  ];
  for (const journey of result.journeys) {
    const failedAttempts = journey.attempts.filter(
      (attempt) => attempt.status !== 'pass',
    ).length;
    lines.push(
      `- ${journey.id}: ${failedAttempts === 0 ? 'pass' : 'fail'} (${journey.attempts.length} attempt(s))`,
    );
    for (const gap of journey.knownLimitations ?? [])
      lines.push(`  - Gap: ${gap}`);
  }
  return `${lines.join('\n')}\n`;
}

function bugExtractionTriage({
  runPlan,
  bugs,
  gatedBugCount,
  gateSeverity,
  bugPacketPath,
  reportPath,
}) {
  const evidenceRefs = [bugPacketPath, reportPath].filter(Boolean);
  return {
    actor: 'journey-bug-extractor',
    action: 'extract-bug-candidates',
    stateBefore: {
      runId: runPlan.runId,
      journeyIds: runPlan.journeyIds,
      severityGate: gateSeverity,
    },
    stateAfter: {
      bugCount: bugs.length,
      gatedBugCount,
      highestSeverity:
        bugs
          .map((bug) => bug.severity)
          .sort(
            (left, right) =>
              (severityRank[right] ?? 0) - (severityRank[left] ?? 0),
          )[0] ?? null,
    },
    ruleDecision: {
      outcome: gatedBugCount > 0 ? 'blocked' : 'accepted',
      source: 'journey-qc',
      reason:
        gatedBugCount > 0
          ? `${gatedBugCount} bug candidate(s) met severity gate ${gateSeverity}.`
          : `No bug candidates met severity gate ${gateSeverity}.`,
    },
    validationResult: {
      status: gatedBugCount > 0 ? 'fail' : 'pass',
      event:
        bugs.length > 0
          ? 'bug.candidate_extracted'
          : 'bug.extraction_completed',
      severityGate: gateSeverity,
    },
    warnings: bugs.map((bug) => `${bug.severity}:${bug.summary}`),
    evidenceRefs,
    nextDebuggingHint:
      `Run npm.cmd run qc:journeys:bugs -- --since=${runPlan.runId} ` +
      `--min-severity=${gateSeverity} to inspect the bug packet.`,
  };
}

export function resolveEvidenceRun(options = {}) {
  const catalog = loadJsonFile(journeyCatalogPath);
  const evidenceRoot = path.resolve(
    repoRoot,
    options.evidenceDir ?? catalog.evidenceDir,
  );
  const runId = options.runId ?? options.since ?? 'latest';
  if (runId === 'latest') {
    const latest = loadJsonFile(path.join(evidenceRoot, 'latest.json'));
    return {
      evidenceRoot,
      runId: latest.runId,
      runDir: path.resolve(repoRoot, latest.runDir),
    };
  }
  return {
    evidenceRoot,
    runId,
    runDir: path.join(evidenceRoot, runId),
  };
}

export function loadRunEvidence(options = {}) {
  const resolved = resolveEvidenceRun(options);
  return {
    ...resolved,
    bugs: loadJsonFile(path.join(resolved.runDir, 'bugs.json')),
    result: loadJsonFile(path.join(resolved.runDir, 'result.json')),
    logs: fs
      .readFileSync(path.join(resolved.runDir, 'system.ndjson'), 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line)),
  };
}

export function filterBugs(bugs, options = {}) {
  const minimum = options.minSeverity ?? 'info';
  return bugs.filter((bug) => {
    if (!severityMeets(bug.severity, minimum)) return false;
    if (
      options.journey &&
      options.journey !== 'all' &&
      bug.journeyId !== options.journey
    )
      return false;
    if (options.module && bug.module !== options.module) return false;
    if (options.fingerprint && bug.fingerprint !== options.fingerprint)
      return false;
    return true;
  });
}

function parseBlockingFilter(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function buildLogFilters(options = {}) {
  return {
    levels: options.level
      ? new Set(options.level.split(',').map((item) => item.trim()))
      : null,
    classifications: options.classification
      ? new Set(options.classification.split(',').map((item) => item.trim()))
      : null,
    blocking: parseBlockingFilter(options.blocking),
    excludeProbes: Boolean(options.excludeProbes || options.actionableOnly),
    journey: options.journey,
    stepId: options.stepId,
    service: options.service,
    event: options.event,
    fingerprint: options.fingerprint,
  };
}

function matchesSeverityFilters(entry, filters) {
  if (filters.levels && !filters.levels.has(entry.level)) return false;
  if (
    filters.classifications &&
    !filters.classifications.has(entry.classification ?? '')
  ) {
    return false;
  }
  if (filters.blocking !== null && entry.blocking !== filters.blocking) {
    return false;
  }
  if (filters.excludeProbes && entry.classification === 'expected-probe') {
    return false;
  }
  return true;
}

function matchesIdentityFilters(entry, filters) {
  if (
    filters.journey &&
    filters.journey !== 'all' &&
    entry.journeyId !== filters.journey
  ) {
    return false;
  }
  if (filters.stepId && entry.stepId !== filters.stepId) return false;
  if (filters.service && entry.service !== filters.service) return false;
  if (filters.event && entry.event !== filters.event) return false;
  if (
    filters.fingerprint &&
    (entry.fingerprint ?? diagnosticFingerprint(entry)) !== filters.fingerprint
  ) {
    return false;
  }
  return true;
}

function logMatchesFilters(entry, filters) {
  return (
    matchesSeverityFilters(entry, filters) &&
    matchesIdentityFilters(entry, filters)
  );
}

export function filterLogs(logs, options = {}) {
  const filters = buildLogFilters(options);
  return logs.filter((entry) => logMatchesFilters(entry, filters));
}

export function logIntentLabel(entry) {
  const parts = [entry.level];
  if (entry.classification) parts.push(entry.classification);
  if (entry.blocking === true) parts.push('blocking');
  if (entry.blocking === false) parts.push('non-blocking');
  return parts.join(' ');
}

export function queryGraph(graph, options = {}) {
  const query = (
    options.query ??
    options.journey ??
    options.module ??
    ''
  ).toLowerCase();
  const kind = options.kind;
  const matchedNodes = graph.nodes.filter((node) => {
    if (kind && node.kind !== kind) return false;
    if (!query) return true;
    return (
      node.id.toLowerCase().includes(query) ||
      node.label.toLowerCase().includes(query)
    );
  });
  const matchedIds = new Set(matchedNodes.map((node) => node.id));
  const relatedEdges = graph.edges.filter(
    (edge) => matchedIds.has(edge.from) || matchedIds.has(edge.to),
  );
  const relatedIds = new Set([...matchedIds]);
  for (const edge of relatedEdges) {
    relatedIds.add(edge.from);
    relatedIds.add(edge.to);
  }
  const relatedNodes = graph.nodes.filter((node) => relatedIds.has(node.id));
  return {
    matchedNodes,
    relatedEdges,
    relatedNodes,
  };
}

export function runJourney(options) {
  const summary = validationSummary();
  if (summary.errors.length > 0) {
    const error = new Error('Journey QC artifacts are invalid.');
    error.issues = summary.issues;
    throw error;
  }
  const runPlan = materializeRunPlan(summary.catalog, options);
  const runDir = path.resolve(repoRoot, runPlan.evidenceDir);
  writeJsonFile(path.join(runDir, 'run-plan.json'), runPlan);
  const { logs, result } = executeRunPlan(runPlan, options);
  const bugs = extractBugCandidates(result, logs);
  const gateSeverity = options.failOnBugSeverity ?? 'medium';
  const gatedBugCount = bugs.filter((bug) =>
    severityMeets(bug.severity, gateSeverity),
  ).length;
  const bugPacketPath = toRepoRelative(
    path.join(path.resolve(repoRoot, runPlan.evidenceDir), 'bugs.json'),
  );
  const reportPath = toRepoRelative(
    path.join(path.resolve(repoRoot, runPlan.evidenceDir), 'report.md'),
  );
  logs.push(
    logEntry({
      level: bugs.length > 0 ? 'warn' : 'info',
      service: 'journey.bugs',
      event:
        bugs.length > 0
          ? 'bug.candidate_extracted'
          : 'bug.extraction_completed',
      message: `Bug extraction produced ${bugs.length} candidate(s).`,
      classification: bugs.length > 0 ? 'actionable-warning' : undefined,
      blocking: bugs.length > 0 ? gatedBugCount > 0 : undefined,
      runPlan,
      attempt: 0,
      metadata: {
        bugCount: bugs.length,
        gatedBugCount,
        severityGate: gateSeverity,
        triage: bugExtractionTriage({
          runPlan,
          bugs,
          gatedBugCount,
          gateSeverity,
          bugPacketPath,
          reportPath,
        }),
      },
    }),
  );
  const paths = writeEvidenceBundle(runPlan, result, logs, bugs);
  return {
    bugs,
    gatedBugCount,
    paths,
    result,
    runPlan,
  };
}
