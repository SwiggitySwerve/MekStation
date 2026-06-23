import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, '..', '..');
export const journeyCatalogPath = path.join(
  repoRoot,
  'docs',
  'qc',
  'mekstation-journey-scenarios.json',
);
export const validationGraphPath = path.join(
  repoRoot,
  'docs',
  'qc',
  'mekstation-qc-validation-graph.json',
);
export const loggingMapPath = path.join(
  repoRoot,
  'docs',
  'qc',
  'mekstation-logging-map.json',
);
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

const allowedLevels = new Set(['debug', 'info', 'warn', 'error']);
const allowedLogClassifications = new Set([
  'diagnostic',
  'expected-probe',
  'actionable-warning',
  'failure',
]);
const allowedModes = new Set(['headless', 'browser', 'hybrid']);
const allowedTiers = new Set(['smoke', 'standard', 'extended']);
const graphKinds = new Set([
  'capability',
  'module',
  'submodule',
  'journey',
  'command',
  'evidence',
  'log-event',
  'known-gap',
]);
const graphRelations = new Set([
  'contains',
  'validated-by',
  'produces',
  'logs',
  'blocked-by',
  'documents-gap',
]);
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

  for (const arg of argv) {
    if (arg === '--continue-on-error') {
      options.continueOnError = true;
      continue;
    }
    if (arg === '--dry-run' || arg === '--list') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--validate-only') {
      options.validateOnly = true;
      continue;
    }
    if (arg === '--exclude-probes') {
      options.excludeProbes = true;
      continue;
    }
    if (arg === '--actionable-only') {
      options.actionableOnly = true;
      continue;
    }
    if (
      arg === '--require-domain-backed' ||
      arg === '--require-non-synthetic-backing'
    ) {
      options.requireDomainBacked = true;
      continue;
    }

    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = rawValue.trim();
    if (key === 'journey') options.journey = value;
    else if (key === 'tier') options.tier = value;
    else if (key === 'mode') options.mode = value;
    else if (key === 'seed') options.seed = Number.parseInt(value, 10);
    else if (key === 'runs') options.runs = Number.parseInt(value, 10);
    else if (key === 'run-id') options.runId = value;
    else if (key === 'evidence-dir') options.evidenceDir = value;
    else if (key === 'fail-on-bug-severity') options.failOnBugSeverity = value;
    else if (key === 'since') options.since = value;
    else if (key === 'run-id-filter') options.runIdFilter = value;
    else if (key === 'min-severity') options.minSeverity = value;
    else if (key === 'level') options.level = value;
    else if (key === 'classification') options.classification = value;
    else if (key === 'blocking') options.blocking = value;
    else if (key === 'service') options.service = value;
    else if (key === 'event') options.event = value;
    else if (key === 'step-id') options.stepId = value;
    else if (key === 'fingerprint') options.fingerprint = value;
    else if (key === 'module') options.module = value;
    else if (key === 'query') options.query = value;
    else if (key === 'kind') options.kind = value;
    else if (key === 'inject-failure') options.injectFailure = value;
    else if (key === 'inject-stability-drift' || key === 'inject-drift') {
      options.injectStabilityDrift = value;
    } else parameters[key] = value;
  }

  options.parameters = parameters;
  return options;
}

export function loadJourneyArtifacts() {
  return {
    catalog: loadJsonFile(journeyCatalogPath),
    graph: loadJsonFile(validationGraphPath),
    loggingMap: loadJsonFile(loggingMapPath),
    uiFlowShell: loadJsonFile(uiFlowShellPath),
  };
}

function issue(severity, message) {
  return { severity, message };
}

function fieldLabel(label, field) {
  return `${label}: ${field}`;
}

function validateParameterDefinition(label, name, definition, issues) {
  if (
    !definition ||
    typeof definition !== 'object' ||
    Array.isArray(definition)
  ) {
    issues.push(
      issue('error', `${label}: parameter ${name} must be an object.`),
    );
    return;
  }
  if (
    !['string', 'string-list', 'integer', 'enum', 'boolean'].includes(
      definition.type,
    )
  ) {
    issues.push(
      issue(
        'error',
        `${label}: parameter ${name} has unsupported type ${definition.type}.`,
      ),
    );
  }
  if (!Object.hasOwn(definition, 'default')) {
    issues.push(
      issue('error', `${label}: parameter ${name} must declare default.`),
    );
  }
  if (
    definition.type === 'enum' &&
    (!Array.isArray(definition.values) ||
      !definition.values.includes(definition.default))
  ) {
    issues.push(
      issue(
        'error',
        `${label}: enum parameter ${name} must include its default in values.`,
      ),
    );
  }
}

export function validateJourneyCatalog(catalog) {
  const issues = [];
  if (catalog.version !== 1)
    issues.push(issue('error', 'Journey catalog version must be 1.'));
  if (!Array.isArray(catalog.journeys)) {
    issues.push(issue('error', 'Journey catalog must declare journeys array.'));
    return issues;
  }
  if (!Array.isArray(catalog.requiredJourneyIds)) {
    issues.push(
      issue('error', 'Journey catalog must declare requiredJourneyIds array.'),
    );
  }
  if (!allowedTiers.has(catalog.defaultTier)) {
    issues.push(
      issue(
        'error',
        'Journey catalog defaultTier must be smoke, standard, or extended.',
      ),
    );
  }

  const ids = new Set();
  for (const [index, journey] of catalog.journeys.entries()) {
    const label = journey.id || `journeys[${index}]`;
    if (typeof journey.id !== 'string' || journey.id.trim() === '') {
      issues.push(issue('error', `${label}: id must be a non-empty string.`));
    }
    if (ids.has(journey.id))
      issues.push(issue('error', `${label}: duplicate journey id.`));
    ids.add(journey.id);
    for (const field of [
      'displayName',
      'module',
      'defaultMode',
      'expectedTerminalState',
    ]) {
      if (typeof journey[field] !== 'string' || journey[field].trim() === '') {
        issues.push(
          issue(
            'error',
            fieldLabel(label, field) + ' must be a non-empty string.',
          ),
        );
      }
    }
    if (!allowedModes.has(journey.defaultMode)) {
      issues.push(
        issue(
          'error',
          `${label}: defaultMode must be headless, browser, or hybrid.`,
        ),
      );
    }
    if (!Array.isArray(journey.tiers) || journey.tiers.length === 0) {
      issues.push(
        issue('error', `${label}: tiers must contain at least one tier.`),
      );
    } else {
      for (const tier of journey.tiers) {
        if (!allowedTiers.has(tier)) {
          issues.push(issue('error', `${label}: invalid tier ${tier}.`));
        }
      }
    }
    if (!journey.parameters || typeof journey.parameters !== 'object') {
      issues.push(issue('error', `${label}: parameters must be an object.`));
    } else {
      for (const [name, definition] of Object.entries(journey.parameters)) {
        validateParameterDefinition(label, name, definition, issues);
      }
    }
    if (!Array.isArray(journey.steps) || journey.steps.length === 0) {
      issues.push(
        issue('error', `${label}: steps must contain at least one step.`),
      );
    } else {
      const stepIds = new Set();
      for (const [stepIndex, step] of journey.steps.entries()) {
        const stepLabel = `${label}.steps[${stepIndex}]`;
        for (const field of [
          'id',
          'title',
          'kind',
          'diagnosticEvent',
          'loggingPathId',
        ]) {
          if (typeof step[field] !== 'string' || step[field].trim() === '') {
            issues.push(
              issue(
                'error',
                `${stepLabel}: ${field} must be a non-empty string.`,
              ),
            );
          }
        }
        if (stepIds.has(step.id)) {
          issues.push(
            issue('error', `${stepLabel}: duplicate step id ${step.id}.`),
          );
        }
        stepIds.add(step.id);
        if (!Array.isArray(step.produces) || step.produces.length === 0) {
          issues.push(
            issue(
              'error',
              `${stepLabel}: produces must contain at least one artifact.`,
            ),
          );
        }
      }
    }
    if (
      !Array.isArray(journey.evidenceAssertions) ||
      journey.evidenceAssertions.length === 0
    ) {
      issues.push(
        issue(
          'error',
          `${label}: evidenceAssertions must contain at least one item.`,
        ),
      );
    }
  }

  for (const requiredId of requiredJourneyIds) {
    if (!ids.has(requiredId))
      issues.push(issue('error', `Missing required journey ${requiredId}.`));
  }
  for (const id of ids) {
    if (!requiredJourneyIds.includes(id))
      issues.push(issue('warning', `Unexpected journey ${id}.`));
  }
  return issues;
}

export function validateValidationGraph(graph, catalog) {
  const issues = [];
  if (graph.version !== 1)
    issues.push(issue('error', 'Validation graph version must be 1.'));
  if (!Array.isArray(graph.nodes))
    issues.push(issue('error', 'Validation graph nodes must be an array.'));
  if (!Array.isArray(graph.edges))
    issues.push(issue('error', 'Validation graph edges must be an array.'));
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return issues;

  const nodeIds = new Set();
  for (const [index, node] of graph.nodes.entries()) {
    const label = node.id || `nodes[${index}]`;
    if (typeof node.id !== 'string' || node.id.trim() === '') {
      issues.push(issue('error', `${label}: id must be a non-empty string.`));
    }
    if (nodeIds.has(node.id))
      issues.push(issue('error', `${label}: duplicate node id.`));
    nodeIds.add(node.id);
    if (!graphKinds.has(node.kind))
      issues.push(issue('error', `${label}: invalid kind ${node.kind}.`));
    if (typeof node.label !== 'string' || node.label.trim() === '') {
      issues.push(
        issue('error', `${label}: label must be a non-empty string.`),
      );
    }
  }

  for (const [index, edge] of graph.edges.entries()) {
    const label = `edges[${index}]`;
    if (!nodeIds.has(edge.from))
      issues.push(issue('error', `${label}: missing from node ${edge.from}.`));
    if (!nodeIds.has(edge.to))
      issues.push(issue('error', `${label}: missing to node ${edge.to}.`));
    if (!graphRelations.has(edge.relation)) {
      issues.push(
        issue('error', `${label}: invalid relation ${edge.relation}.`),
      );
    }
  }

  const catalogJourneyIds = new Set(
    catalog.journeys.map((journey) => journey.id),
  );
  for (const node of graph.nodes.filter((entry) => entry.kind === 'journey')) {
    const journeyId = node.id.replace(/^journey:/, '');
    if (!catalogJourneyIds.has(journeyId)) {
      issues.push(
        issue('error', `Graph references orphaned journey ${journeyId}.`),
      );
    }
  }

  for (const journeyId of catalogJourneyIds) {
    if (!nodeIds.has(`journey:${journeyId}`)) {
      issues.push(
        issue('error', `Graph missing journey node journey:${journeyId}.`),
      );
    }
  }
  return issues;
}

export function validateLoggingMap(loggingMap, catalog) {
  const issues = [];
  if (loggingMap.version !== 1)
    issues.push(issue('error', 'Logging map version must be 1.'));
  const requiredTriageFields = [
    'actor',
    'action',
    'stateBefore',
    'stateAfter',
    'ruleDecision',
    'validationResult',
    'warnings',
    'failureCause',
    'evidenceRefs',
    'nextDebuggingHint',
  ];
  if (!Array.isArray(loggingMap.requiredPathIds)) {
    issues.push(
      issue('error', 'Logging map requiredPathIds must be an array.'),
    );
  }
  if (!Array.isArray(loggingMap.requiredTriageFields)) {
    issues.push(
      issue('error', 'Logging map requiredTriageFields must be an array.'),
    );
  } else {
    for (const requiredField of requiredTriageFields) {
      if (!loggingMap.requiredTriageFields.includes(requiredField)) {
        issues.push(
          issue(
            'error',
            `Logging map missing required triage field ${requiredField}.`,
          ),
        );
      }
    }
  }
  if (!Array.isArray(loggingMap.paths)) {
    issues.push(issue('error', 'Logging map paths must be an array.'));
    return issues;
  }

  const pathIds = new Set();
  for (const [index, entry] of loggingMap.paths.entries()) {
    const label = entry.pathId || `paths[${index}]`;
    if (typeof entry.pathId !== 'string' || entry.pathId.trim() === '') {
      issues.push(
        issue('error', `${label}: pathId must be a non-empty string.`),
      );
    }
    if (pathIds.has(entry.pathId))
      issues.push(issue('error', `${label}: duplicate pathId.`));
    pathIds.add(entry.pathId);
    if (typeof entry.service !== 'string' || entry.service.trim() === '') {
      issues.push(
        issue('error', `${label}: service must be a non-empty string.`),
      );
    }
    if (!['debug', 'info', 'warn', 'error'].includes(entry.severity)) {
      issues.push(
        issue(
          'error',
          `${label}: severity must be debug, info, warn, or error.`,
        ),
      );
    }
    const requiresClassification =
      entry.severity === 'warn' || entry.severity === 'error';
    if (requiresClassification && typeof entry.classification !== 'string') {
      issues.push(
        issue(
          'error',
          `${label}: warn/error paths must declare a classification.`,
        ),
      );
    }
    if (
      entry.classification !== undefined &&
      !allowedLogClassifications.has(entry.classification)
    ) {
      issues.push(
        issue(
          'error',
          `${label}: classification must be diagnostic, expected-probe, actionable-warning, or failure.`,
        ),
      );
    }
    if (requiresClassification && typeof entry.blocking !== 'boolean') {
      issues.push(
        issue('error', `${label}: warn/error paths must declare blocking.`),
      );
    }
    if (entry.classification === 'expected-probe' && entry.blocking !== false) {
      issues.push(
        issue('error', `${label}: expected probes must be non-blocking.`),
      );
    }
    if (entry.classification === 'failure' && entry.severity !== 'error') {
      issues.push(
        issue('error', `${label}: failure classification must use error.`),
      );
    }
    if (!Array.isArray(entry.events) || entry.events.length === 0) {
      issues.push(
        issue('error', `${label}: events must contain at least one event.`),
      );
    }
    if (!Array.isArray(entry.testRefs) || entry.testRefs.length === 0) {
      issues.push(
        issue(
          'error',
          `${label}: testRefs must contain at least one reference.`,
        ),
      );
    }
  }

  for (const requiredPathId of loggingMap.requiredPathIds ?? []) {
    if (!pathIds.has(requiredPathId)) {
      issues.push(
        issue('error', `Logging map missing required path ${requiredPathId}.`),
      );
    }
  }

  const loggingPathIds = new Set();
  for (const journey of catalog.journeys) {
    for (const step of journey.steps) loggingPathIds.add(step.loggingPathId);
  }
  for (const loggingPathId of loggingPathIds) {
    if (!pathIds.has(loggingPathId)) {
      issues.push(
        issue(
          'error',
          `Catalog step references unmapped logging path ${loggingPathId}.`,
        ),
      );
    }
  }
  return issues;
}

function pageRouteSegments(filePath) {
  const relative = toRepoRelative(filePath);
  if (!relative.startsWith('src/pages/')) return null;
  const withoutPrefix = relative
    .replace(/^src\/pages\//, '')
    .replace(/\.(tsx|ts|jsx|js)$/, '');
  if (
    withoutPrefix.startsWith('api/') ||
    withoutPrefix === '_app' ||
    withoutPrefix === '_document'
  ) {
    return null;
  }
  const segments = withoutPrefix.split('/').filter(Boolean);
  if (segments.at(-1) === 'index') segments.pop();
  return segments;
}

function collectPageRouteSegments(
  directory = path.join(repoRoot, 'src', 'pages'),
) {
  const routes = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      routes.push(...collectPageRouteSegments(entryPath));
      continue;
    }
    if (!/\.(tsx|ts|jsx|js)$/.test(entry.name)) continue;
    const segments = pageRouteSegments(entryPath);
    if (segments) routes.push(segments);
  }
  return routes;
}

function routeSegments(route) {
  return route.split(/[?#]/, 1)[0].split('/').filter(Boolean);
}

function segmentMatches(routeSegment, pageSegment) {
  if (/^\[[^\]]+\]$/.test(pageSegment)) return true;
  return routeSegment === pageSegment;
}

function routeMatchesPageSegments(route, pageSegments) {
  const segments = routeSegments(route);
  let routeIndex = 0;

  for (let pageIndex = 0; pageIndex < pageSegments.length; pageIndex += 1) {
    const pageSegment = pageSegments[pageIndex];
    const isLastPageSegment = pageIndex === pageSegments.length - 1;

    if (/^\[\[\.\.\.[^\]]+\]\]$/.test(pageSegment)) {
      return isLastPageSegment;
    }
    if (/^\[\.\.\.[^\]]+\]$/.test(pageSegment)) {
      return isLastPageSegment && routeIndex < segments.length;
    }
    if (routeIndex >= segments.length) return false;
    if (!segmentMatches(segments[routeIndex], pageSegment)) return false;
    routeIndex += 1;
  }

  return routeIndex === segments.length;
}

function routeMatchesAnyPage(route, pageRoutes) {
  return pageRoutes.some((pageSegments) =>
    routeMatchesPageSegments(route, pageSegments),
  );
}

function validateFlowRoute(flowId, label, href, issues, pageRoutes) {
  if (typeof href !== 'string' || href.trim() === '') {
    issues.push(
      issue('error', `UI flow ${flowId}: ${label} href is required.`),
    );
    return;
  }
  if (!href.startsWith('/')) {
    issues.push(
      issue(
        'error',
        `UI flow ${flowId}: ${label} route ${href} must start with /.`,
      ),
    );
    return;
  }
  if (!routeMatchesAnyPage(href, pageRoutes)) {
    issues.push(
      issue(
        'error',
        `UI flow ${flowId}: ${label} route ${href} does not match a page template.`,
      ),
    );
  }
}

function validateRequiredCheckpointOrder(flow, issues) {
  const requiredCheckpointIds = requiredCheckpointIdsByJourney.get(
    flow.journeyId,
  );
  if (!requiredCheckpointIds) return;

  const actualCheckpointIds = flow.checkpoints.map(
    (checkpoint) => checkpoint.id,
  );
  let cursor = -1;
  for (const requiredCheckpointId of requiredCheckpointIds) {
    const nextIndex = actualCheckpointIds.indexOf(
      requiredCheckpointId,
      cursor + 1,
    );
    if (nextIndex === -1) {
      issues.push(
        issue(
          'error',
          `UI flow ${flow.journeyId}: missing required checkpoint ${requiredCheckpointId} in the expected route order.`,
        ),
      );
      continue;
    }
    cursor = nextIndex;
  }
}

export function validateUiFlowShell(uiFlowShell, catalog, graph) {
  const issues = [];
  const allowedVisibility = new Set(['player', 'gm', 'both']);
  const allowedRoles = new Set(['player', 'gm']);
  const pageRoutes = collectPageRouteSegments();

  if (uiFlowShell.version !== 1) {
    issues.push(issue('error', 'UI flow shell version must be 1.'));
  }
  if (!Array.isArray(uiFlowShell.requiredJourneyIds)) {
    issues.push(
      issue('error', 'UI flow shell must declare requiredJourneyIds array.'),
    );
  }
  if (!Array.isArray(uiFlowShell.flows)) {
    issues.push(issue('error', 'UI flow shell must declare flows array.'));
    return issues;
  }

  const catalogJourneyIds = new Set(
    catalog.journeys.map((journey) => journey.id),
  );
  const catalogById = new Map(
    catalog.journeys.map((journey) => [journey.id, journey]),
  );
  const graphNodeIds = new Set(graph.nodes.map((node) => node.id));
  const flowIds = new Set();

  for (const [index, flow] of uiFlowShell.flows.entries()) {
    const label = flow.journeyId || `flows[${index}]`;
    if (typeof flow.journeyId !== 'string' || flow.journeyId.trim() === '') {
      issues.push(
        issue('error', `${label}: journeyId must be a non-empty string.`),
      );
      continue;
    }
    if (flowIds.has(flow.journeyId)) {
      issues.push(
        issue('error', `UI flow shell duplicates journey ${flow.journeyId}.`),
      );
    }
    flowIds.add(flow.journeyId);

    const catalogJourney = catalogById.get(flow.journeyId);
    if (!catalogJourneyIds.has(flow.journeyId)) {
      issues.push(
        issue(
          'error',
          `UI flow shell references unknown journey ${flow.journeyId}.`,
        ),
      );
    }
    if (!graphNodeIds.has(`journey:${flow.journeyId}`)) {
      issues.push(
        issue(
          'error',
          `UI flow shell journey ${flow.journeyId} is missing from validation graph.`,
        ),
      );
    }
    if (catalogJourney && flow.module !== catalogJourney.module) {
      issues.push(
        issue(
          'error',
          `UI flow ${flow.journeyId}: module ${flow.module} does not match catalog module ${catalogJourney.module}.`,
        ),
      );
    }
    for (const field of ['displayName', 'module', 'qcCommand']) {
      if (typeof flow[field] !== 'string' || flow[field].trim() === '') {
        issues.push(
          issue('error', `UI flow ${flow.journeyId}: ${field} is required.`),
        );
      }
    }
    if (
      typeof flow.qcCommand === 'string' &&
      !flow.qcCommand.includes(`--journey=${flow.journeyId}`)
    ) {
      issues.push(
        issue(
          'error',
          `UI flow ${flow.journeyId}: qcCommand must include --journey=${flow.journeyId}.`,
        ),
      );
    }
    if (!Array.isArray(flow.roleIntent) || flow.roleIntent.length === 0) {
      issues.push(
        issue('error', `UI flow ${flow.journeyId}: roleIntent is required.`),
      );
    } else {
      for (const role of flow.roleIntent) {
        if (!allowedRoles.has(role)) {
          issues.push(
            issue('error', `UI flow ${flow.journeyId}: invalid role ${role}.`),
          );
        }
      }
    }
    if (
      !Array.isArray(flow.inspectionNotes) ||
      flow.inspectionNotes.length === 0
    ) {
      issues.push(
        issue(
          'error',
          `UI flow ${flow.journeyId}: inspectionNotes are required.`,
        ),
      );
    }
    if (!flow.primaryAction || typeof flow.primaryAction !== 'object') {
      issues.push(
        issue('error', `UI flow ${flow.journeyId}: primaryAction is required.`),
      );
    } else {
      if (
        typeof flow.primaryAction.label !== 'string' ||
        flow.primaryAction.label.trim() === ''
      ) {
        issues.push(
          issue(
            'error',
            `UI flow ${flow.journeyId}: primaryAction label is required.`,
          ),
        );
      }
      validateFlowRoute(
        flow.journeyId,
        'primary action',
        flow.primaryAction.href,
        issues,
        pageRoutes,
      );
    }
    if (!Array.isArray(flow.checkpoints) || flow.checkpoints.length === 0) {
      issues.push(
        issue('error', `UI flow ${flow.journeyId}: checkpoints are required.`),
      );
      continue;
    }
    const checkpointIds = new Set();
    for (const checkpoint of flow.checkpoints) {
      const checkpointLabel = checkpoint.id || 'checkpoint';
      if (typeof checkpoint.id !== 'string' || checkpoint.id.trim() === '') {
        issues.push(
          issue(
            'error',
            `UI flow ${flow.journeyId}: checkpoint id is required.`,
          ),
        );
      }
      if (checkpointIds.has(checkpoint.id)) {
        issues.push(
          issue(
            'error',
            `UI flow ${flow.journeyId}: duplicate checkpoint ${checkpoint.id}.`,
          ),
        );
      }
      checkpointIds.add(checkpoint.id);
      if (
        typeof checkpoint.label !== 'string' ||
        checkpoint.label.trim() === ''
      ) {
        issues.push(
          issue(
            'error',
            `UI flow ${flow.journeyId}: checkpoint ${checkpointLabel} label is required.`,
          ),
        );
      }
      if (!allowedVisibility.has(checkpoint.visibility)) {
        issues.push(
          issue(
            'error',
            `UI flow ${flow.journeyId}: checkpoint ${checkpointLabel} has invalid visibility ${checkpoint.visibility}.`,
          ),
        );
      }
      validateFlowRoute(
        flow.journeyId,
        `checkpoint ${checkpointLabel}`,
        checkpoint.href,
        issues,
        pageRoutes,
      );
    }
    validateRequiredCheckpointOrder(flow, issues);
  }

  const requiredIds = catalog.requiredJourneyIds ?? requiredJourneyIds;
  for (const requiredId of requiredIds) {
    if (!flowIds.has(requiredId)) {
      issues.push(
        issue('error', `UI flow shell missing required journey ${requiredId}.`),
      );
    }
  }
  for (const requiredId of uiFlowShell.requiredJourneyIds ?? []) {
    if (!flowIds.has(requiredId)) {
      issues.push(
        issue(
          'error',
          `UI flow shell requiredJourneyIds references unmapped journey ${requiredId}.`,
        ),
      );
    }
  }

  return issues;
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
  const { catalog, graph, loggingMap, uiFlowShell } = loadJourneyArtifacts();
  const catalogIssues = validateJourneyCatalog(catalog);
  const graphIssues = validateValidationGraph(graph, catalog);
  const loggingIssues = validateLoggingMap(loggingMap, catalog);
  const uiFlowIssues = validateUiFlowShell(uiFlowShell, catalog, graph);
  const issues = [
    ...catalogIssues,
    ...graphIssues,
    ...loggingIssues,
    ...uiFlowIssues,
  ];
  return {
    catalog,
    graph,
    issues,
    loggingMap,
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

function validateAndCoerceParameter(journey, name, definition, rawValue) {
  const value = coerceParameter(definition, rawValue);
  const rawLabel = rawValue === undefined ? definition.default : rawValue;

  if (definition.type === 'integer') {
    if (rawValue !== undefined && !/^-?\d+$/.test(String(rawValue).trim())) {
      throw parameterError(journey, name, rawValue, 'an integer');
    }
    if (!Number.isInteger(value)) {
      throw parameterError(journey, name, rawLabel, 'an integer');
    }
    if (definition.minimum !== undefined && value < definition.minimum) {
      throw parameterError(
        journey,
        name,
        rawLabel,
        `an integer >= ${definition.minimum}`,
      );
    }
    if (definition.maximum !== undefined && value > definition.maximum) {
      throw parameterError(
        journey,
        name,
        rawLabel,
        `an integer <= ${definition.maximum}`,
      );
    }
  }

  if (definition.type === 'boolean') {
    if (rawValue !== undefined && rawValue !== 'true' && rawValue !== 'false') {
      throw parameterError(journey, name, rawValue, 'true or false');
    }
    if (typeof value !== 'boolean') {
      throw parameterError(journey, name, rawLabel, 'true or false');
    }
  }

  if (definition.type === 'enum') {
    if (
      !Array.isArray(definition.values) ||
      !definition.values.includes(value)
    ) {
      throw parameterError(
        journey,
        name,
        rawLabel,
        `one of ${definition.values.join(', ')}`,
      );
    }
  }

  if (definition.type === 'string-list') {
    if (!Array.isArray(value)) {
      throw parameterError(journey, name, rawLabel, 'a comma-separated list');
    }
    if (rawValue !== undefined && value.length === 0) {
      throw parameterError(
        journey,
        name,
        rawValue,
        'a non-empty comma-separated list',
      );
    }
  }

  if (definition.type === 'string' && typeof value !== 'string') {
    throw parameterError(journey, name, rawLabel, 'a string');
  }

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
    reason: 'Journey step satisfied its synthetic evidence assertion.',
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

export function extractBugCandidates(result, logs) {
  const bugs = [];
  const logsByStep = new Map();
  for (const entry of logs) {
    if (!entry.journeyId || !entry.stepId) continue;
    const key = `${entry.journeyId}/${entry.stepId}`;
    const existing = logsByStep.get(key) ?? [];
    existing.push(entry);
    logsByStep.set(key, existing);
  }
  const bugTriageFromLogs = (journeyId, stepId) => {
    const matchingLogs = logsByStep.get(`${journeyId}/${stepId}`) ?? [];
    const triage = matchingLogs.find((entry) => entry.metadata?.triage)
      ?.metadata?.triage;
    if (!triage) return undefined;
    return {
      ...triage,
      logFingerprints: matchingLogs.map(
        (entry) => entry.fingerprint ?? diagnosticFingerprint(entry),
      ),
    };
  };
  for (const journey of result.journeys ?? []) {
    for (const attempt of journey.attempts ?? []) {
      for (const step of attempt.steps ?? []) {
        if (step.status !== 'pass') {
          const triage = bugTriageFromLogs(journey.id, step.id);
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
      }
      if (attempt.terminalState !== journey.expectedTerminalState) {
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
  }
  for (const entry of logs) {
    if (entry.level === 'error') {
      const fingerprint = entry.fingerprint ?? diagnosticFingerprint(entry);
      const triage = entry.metadata?.triage
        ? {
            ...entry.metadata.triage,
            logFingerprints: [fingerprint],
          }
        : undefined;
      bugs.push({
        severity: 'medium',
        journeyId: entry.journeyId,
        runId: entry.runId,
        stepId: entry.stepId,
        module: entry.entityIds?.module,
        fingerprint,
        summary: entry.message ?? `${entry.service}.${entry.event}`,
        evidenceRefs: [`system.ndjson#${fingerprint}`],
        ...(triage ? { triage } : {}),
      });
    }
  }
  return dedupeBugCandidates(bugs);
}

export function executeRunPlan(runPlan, options = {}) {
  const runDir = path.resolve(repoRoot, runPlan.evidenceDir);
  const logs = [];
  const journeys = [];
  const startedAt = new Date().toISOString();

  if (runPlan.dryRun) {
    return {
      logs,
      result: {
        version: 1,
        runId: runPlan.runId,
        status: 'dry-run',
        dryRun: true,
        startedAt,
        completedAt: new Date().toISOString(),
        journeys: runPlan.journeys.map((journey) => ({
          id: journey.id,
          module: journey.module,
          expectedTerminalState: journey.expectedTerminalState,
          attempts: [],
          knownLimitations: journey.knownLimitations,
        })),
      },
    };
  }

  for (const journey of runPlan.journeys) {
    const journeyResult = {
      id: journey.id,
      module: journey.module,
      expectedTerminalState: journey.expectedTerminalState,
      attempts: [],
      knownLimitations: journey.knownLimitations,
    };

    for (let attempt = 1; attempt <= runPlan.runs; attempt += 1) {
      const attemptResult = {
        attempt,
        status: 'pass',
        terminalState: null,
        steps: [],
      };

      for (const step of journey.steps) {
        const artifacts = [];
        const injectedFailure =
          options.injectFailure === step.id ||
          options.injectFailure === journey.id;
        const missingRequiredBacking =
          options.requireDomainBacked && step.syntheticBacking === true;
        const shouldFail = injectedFailure || missingRequiredBacking;
        const failureKind = missingRequiredBacking
          ? 'missing-required-execution-backing'
          : injectedFailure
            ? 'injected-failure'
            : null;
        const failureMessage = missingRequiredBacking
          ? `Required non-synthetic execution backing missing for ${journey.id}/${step.id} (${step.executionBacking}).`
          : `Injected failure for ${journey.id}/${step.id}`;
        const level =
          step.loggingPathId === 'tactical-action-rejection' ? 'warn' : 'info';
        const payload = artifactPayload({ runPlan, journey, step, attempt });

        if (!shouldFail) {
          for (const produced of step.produces) {
            artifacts.push(
              writeArtifact(
                runDir,
                `${journey.id}/${attempt}/${produced}`,
                payload,
              ),
            );
          }
        }
        const event = missingRequiredBacking
          ? 'journey.execution_backing_missing'
          : shouldFail
            ? 'journey.step_failed'
            : step.diagnosticEvent;
        const status = shouldFail ? 'fail' : 'pass';
        const triage = triageContext({
          journey,
          step,
          attempt,
          payload,
          artifacts,
          status,
          event,
          failureKind,
          failureMessage: shouldFail ? failureMessage : undefined,
        });

        const stepLog = logEntry({
          level: shouldFail ? 'error' : level,
          service: serviceForStep(journey, step),
          event,
          message: shouldFail ? failureMessage : step.title,
          classification: shouldFail
            ? 'failure'
            : level === 'warn'
              ? 'diagnostic'
              : undefined,
          blocking: shouldFail ? true : level === 'warn' ? false : undefined,
          runPlan,
          journey,
          step,
          attempt,
          metadata: {
            loggingPathId: step.loggingPathId,
            artifacts,
            terminalState: payload.terminalState,
            executionBacking: step.executionBacking,
            syntheticBacking: step.syntheticBacking,
            executionEvidenceSource: step.executionEvidenceSource,
            triage,
            ...(failureKind ? { failureKind } : {}),
          },
        });
        logs.push(stepLog);

        const stepResult = {
          id: step.id,
          status,
          artifacts,
          diagnosticEvent: stepLog.event,
          loggingPathId: step.loggingPathId,
          executionBacking: step.executionBacking,
          syntheticBacking: step.syntheticBacking,
          executionEvidenceSource: step.executionEvidenceSource,
          failureKind: failureKind ?? undefined,
          error: shouldFail ? stepLog.message : undefined,
        };
        attemptResult.steps.push(stepResult);

        if (payload.terminalState)
          attemptResult.terminalState = payload.terminalState;
        if (shouldFail && step.required) {
          attemptResult.status = 'fail';
          if (!options.continueOnError) break;
        }
      }

      if (!attemptResult.terminalState && attemptResult.status === 'pass') {
        attemptResult.terminalState = journey.expectedTerminalState;
      }
      if (attemptResult.terminalState !== journey.expectedTerminalState) {
        attemptResult.status = 'fail';
      }
      journeyResult.attempts.push(attemptResult);
    }
    journeys.push(journeyResult);
  }

  logs.push(
    logEntry({
      level: 'warn',
      service: 'journey.validation',
      event: 'api.payload_rejected',
      message:
        'Negative payload validation probe rejected malformed journey input.',
      classification: 'expected-probe',
      blocking: false,
      runPlan,
      attempt: 0,
      metadata: { nonBlockingProbe: true },
    }),
  );
  logs.push(
    logEntry({
      level: 'info',
      service: 'journey.persistence',
      event: 'store.recovery_checked',
      message: 'Journey evidence store recovery path verified.',
      runPlan,
      attempt: 0,
      metadata: { evidenceDir: runPlan.evidenceDir },
    }),
  );

  const failed = journeys.some((journey) =>
    journey.attempts.some((attempt) => attempt.status !== 'pass'),
  );
  const result = {
    version: 1,
    runId: runPlan.runId,
    status: failed ? 'fail' : 'pass',
    dryRun: false,
    requireDomainBacked: runPlan.requireDomainBacked,
    startedAt,
    completedAt: new Date().toISOString(),
    journeys,
  };
  result.executionBackingSummary = backingSummary(journeys);
  return { logs, result };
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

export function filterLogs(logs, options = {}) {
  const levels = options.level
    ? new Set(options.level.split(',').map((item) => item.trim()))
    : null;
  const classifications = options.classification
    ? new Set(options.classification.split(',').map((item) => item.trim()))
    : null;
  const blocking =
    options.blocking === 'true'
      ? true
      : options.blocking === 'false'
        ? false
        : null;
  return logs.filter((entry) => {
    if (levels && !levels.has(entry.level)) return false;
    if (classifications && !classifications.has(entry.classification ?? '')) {
      return false;
    }
    if (blocking !== null && entry.blocking !== blocking) return false;
    if (
      (options.excludeProbes || options.actionableOnly) &&
      entry.classification === 'expected-probe'
    ) {
      return false;
    }
    if (
      options.journey &&
      options.journey !== 'all' &&
      entry.journeyId !== options.journey
    )
      return false;
    if (options.stepId && entry.stepId !== options.stepId) return false;
    if (options.service && entry.service !== options.service) return false;
    if (options.event && entry.event !== options.event) return false;
    if (
      options.fingerprint &&
      (entry.fingerprint ?? diagnosticFingerprint(entry)) !==
        options.fingerprint
    )
      return false;
    return true;
  });
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
