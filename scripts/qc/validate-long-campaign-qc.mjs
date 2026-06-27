#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const registryPath =
  process.env.MEKSTATION_QC_REGISTRY_PATH ??
  path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-registry.json');
const packageJsonPath =
  process.env.MEKSTATION_PACKAGE_JSON_PATH ??
  path.join(repoRoot, 'package.json');
const journeyCatalogPath =
  process.env.MEKSTATION_JOURNEY_CATALOG_PATH ??
  path.join(repoRoot, 'docs', 'qc', 'mekstation-journey-scenarios.json');
const uiFlowShellPath =
  process.env.MEKSTATION_UI_FLOW_SHELL_PATH ??
  path.join(repoRoot, 'src', 'qc', 'gameplayUiFlowShell.json');
const validationGraphPath =
  process.env.MEKSTATION_QC_VALIDATION_GRAPH_PATH ??
  path.join(repoRoot, 'docs', 'qc', 'mekstation-qc-validation-graph.json');
const openSpecChangesDir =
  process.env.MEKSTATION_OPENSPEC_CHANGES_DIR ??
  path.join(repoRoot, 'openspec', 'changes');
const sourceAnchorsPath =
  process.env.MEKSTATION_CAMPAIGN_LONG_QC_ANCHORS_PATH ?? null;

const JOURNEY_ID = 'campaign-long';
const SURFACE_ID = 'long-campaign-stability';
const CLAIM_ID = 'campaign.long-stability';
const PARENT_SURFACE_ID = 'campaign-economy-progression';
const EXPECTED_CHECKPOINT_IDS = [
  'campaign-base',
  'starmap',
  'medical',
  'salvage',
  'repair',
  'finances',
  'campaign-log',
];

const requiredPackageScripts = [
  {
    id: 'qc:campaign-long:validate',
    tokens: ['validate-long-campaign-qc.mjs'],
  },
  {
    id: 'qc:campaign-long:browser',
    tokens: ['e2e/campaign-long-browser-signoff.spec.ts'],
  },
  {
    id: 'verify:qc:campaign-long',
    tokens: [
      'qc:campaign-long:validate',
      'qc:campaign-long:stability',
      'qc:campaign-long:browser',
      '--seed=42',
      '--contracts=10',
      '--runs=2',
    ],
  },
  {
    id: 'verify:qc:campaign-journeys',
    tokens: [
      'qc:journeys:validate',
      '--journey=contract-campaign',
      '--journey=campaign-short',
      '--journey=campaign-long',
      '--contracts=10',
      '--require-domain-backed',
    ],
  },
  {
    id: 'verify:qc',
    tokens: ['verify:qc:campaign-journeys', 'verify:qc:campaign-long'],
  },
];

const requiredSurface = {
  id: SURFACE_ID,
  parentId: PARENT_SURFACE_ID,
  claimId: CLAIM_ID,
  commandIncludes: [
    'qc:campaign-long:validate',
    'verify:qc:campaign-long',
    'qc:campaign-long:stability',
    'qc:campaign-long:browser',
    '--contracts=10',
    '--runs=2',
  ],
  specIncludes: [
    'openspec/specs/journey-qc/spec.md',
    'openspec/specs/ui-flow-shell/spec.md',
  ],
};

const defaultSourceAnchors = [
  {
    id: 'long-campaign-stability-script',
    path: 'scripts/qc/validate-long-campaign-stability.mjs',
    tokens: [
      "const JOURNEY_ID = 'campaign-long'",
      "const EXPECTED_TERMINAL_STATE = 'campaign-sequence-complete'",
      'const DEFAULT_CONTRACTS = 10',
      'contracts < 6 || contracts > 10',
      'options.runs < 2',
      'stability-manifest.json',
      'saveRoundTripCheck',
      'collectUiFlowEvidence',
      'campaign.stability_checked',
      'campaign.stability_drift_detected',
    ],
  },
  {
    id: 'long-campaign-journey-catalog',
    path: 'docs/qc/mekstation-journey-scenarios.json',
    tokens: [
      '"id": "campaign-long"',
      '"expectedTerminalState": "campaign-sequence-complete"',
      '"minimum": 6',
      '"maximum": 10',
      '"executionBacking": "domain-command"',
      '"executionBacking": "hybrid-command"',
      '"syntheticBacking": false',
      '"executionEvidenceSource": "package:qc:campaign-long:stability"',
      '"executionEvidenceSource": "package:verify:qc:campaign-long"',
      '"executionProofCommands"',
      '"knownLimitations": []',
    ],
  },
  {
    id: 'long-campaign-browser-signoff',
    path: 'e2e/campaign-long-browser-signoff.spec.ts',
    tokens: [
      'Strict Long-Campaign Browser Signoff',
      'seedLongCampaign',
      '10-contract campaign checkpoints',
      'campaignMissionCount: 10',
      'rosterMissionCount: 10',
      'activityLogCount: 10',
      'starmap-travel-controls',
      'medical-bay-list',
      'repair-bay-queue',
      'salvage-panel',
      'finances-panel',
      'activity-log-table',
    ],
  },
  {
    id: 'long-campaign-ui-flow',
    path: 'src/qc/gameplayUiFlowShell.json',
    tokens: [
      '"journeyId": "campaign-long"',
      'qc:campaign-long:stability',
      '"id": "campaign-base"',
      '"id": "medical"',
      '"id": "finances"',
      '"id": "campaign-log"',
    ],
  },
  {
    id: 'long-campaign-stability-tests',
    path: 'scripts/__tests__/journey-qc.test.ts',
    tokens: [
      'writes long-campaign stability evidence with stable digests and save round trips',
      'fails long-campaign stability when normalized artifact drift is detected',
      'campaign.stability_checked',
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

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll('\\', '/');
}

function activeChangeExists(changeId) {
  return fs.existsSync(path.join(openSpecChangesDir, changeId));
}

function validatePackageScripts(packageJson, issues) {
  const scripts = packageJson.scripts ?? {};
  const validated = [];

  for (const contract of requiredPackageScripts) {
    const value = scripts[contract.id];
    if (typeof value !== 'string' || value.trim() === '') {
      issues.push(
        issue(
          'error',
          'package-script-missing',
          `package.json must define script ${contract.id}.`,
          { scriptId: contract.id },
        ),
      );
      continue;
    }

    for (const token of contract.tokens) {
      if (!value.includes(token)) {
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

    validated.push({
      scriptId: contract.id,
      tokenCount: contract.tokens.length,
    });
  }

  return validated;
}

function validateActiveRefs(surface, issues) {
  const refs = surface?.activeChangeRefs ?? [];
  for (const changeRef of refs) {
    if (!activeChangeExists(changeRef)) {
      issues.push(
        issue(
          'error',
          'stale-active-change-ref',
          `${surface.surfaceId} references stale or inactive OpenSpec change ${changeRef}.`,
          { surfaceId: surface.surfaceId, changeRef },
        ),
      );
    }
  }
  return refs;
}

function validateSurface(registry, issues) {
  const surfaceById = new Map(
    registry.surfaces.map((surface) => [surface.surfaceId, surface]),
  );
  const parent = surfaceById.get(PARENT_SURFACE_ID);
  const surface = surfaceById.get(requiredSurface.id);

  if (!parent) {
    issues.push(
      issue(
        'error',
        'parent-surface-missing',
        `Required campaign parent surface ${PARENT_SURFACE_ID} is missing.`,
        { surfaceId: PARENT_SURFACE_ID },
      ),
    );
  } else {
    validateActiveRefs(parent, issues);
  }

  if (!surface) {
    issues.push(
      issue(
        'error',
        'surface-missing',
        `Required long-campaign QC surface ${requiredSurface.id} is missing.`,
        { surfaceId: requiredSurface.id },
      ),
    );
    return null;
  }

  if (surface.parentId !== requiredSurface.parentId) {
    issues.push(
      issue(
        'error',
        'surface-parent-mismatch',
        `${requiredSurface.id} must be parented by ${requiredSurface.parentId}.`,
        {
          surfaceId: requiredSurface.id,
          expectedParentId: requiredSurface.parentId,
          actualParentId: surface.parentId,
        },
      ),
    );
  }

  if (!surface.claimIds?.includes(requiredSurface.claimId)) {
    issues.push(
      issue(
        'error',
        'claim-missing',
        `${requiredSurface.id} must include claim ${requiredSurface.claimId}.`,
        { surfaceId: requiredSurface.id, claimId: requiredSurface.claimId },
      ),
    );
  }

  for (const commandToken of requiredSurface.commandIncludes) {
    if (!surface.commands.some((command) => command.includes(commandToken))) {
      issues.push(
        issue(
          'error',
          'command-missing',
          `${requiredSurface.id} must expose a command containing ${commandToken}.`,
          { surfaceId: requiredSurface.id, commandToken },
        ),
      );
    }
  }

  for (const specRef of requiredSurface.specIncludes) {
    if (!surface.specRefs?.includes(specRef)) {
      issues.push(
        issue(
          'error',
          'spec-ref-missing',
          `${requiredSurface.id} must reference ${specRef}.`,
          { surfaceId: requiredSurface.id, specRef },
        ),
      );
    }
  }

  validateActiveRefs(surface, issues);

  return {
    surfaceId: surface.surfaceId,
    parentId: surface.parentId,
    claimIds: surface.claimIds ?? [],
    commandCount: surface.commands.length,
    activeChangeRefs: surface.activeChangeRefs ?? [],
  };
}

function validateJourneyCatalog(catalog, issues) {
  const matches = catalog.journeys.filter(
    (journey) => journey.id === JOURNEY_ID,
  );
  if (matches.length !== 1) {
    issues.push(
      issue(
        'error',
        'journey-cardinality',
        `Expected exactly one ${JOURNEY_ID} journey; found ${matches.length}.`,
        { journeyId: JOURNEY_ID },
      ),
    );
    return null;
  }

  const journey = matches[0];
  const contracts = journey.parameters?.contracts;
  if (journey.expectedTerminalState !== 'campaign-sequence-complete') {
    issues.push(
      issue(
        'error',
        'journey-terminal-state-mismatch',
        `${JOURNEY_ID} must terminate at campaign-sequence-complete.`,
        { journeyId: JOURNEY_ID },
      ),
    );
  }
  if (!journey.tiers?.includes('extended')) {
    issues.push(
      issue(
        'error',
        'journey-tier-missing',
        `${JOURNEY_ID} must expose the extended tier.`,
        { journeyId: JOURNEY_ID, tier: 'extended' },
      ),
    );
  }
  if (!contracts || contracts.type !== 'integer') {
    issues.push(
      issue(
        'error',
        'contracts-parameter-missing',
        `${JOURNEY_ID} contracts parameter must be an integer definition.`,
        { journeyId: JOURNEY_ID },
      ),
    );
  } else {
    if (contracts.minimum !== 6) {
      issues.push(
        issue(
          'error',
          'contracts-minimum-mismatch',
          `${JOURNEY_ID} contracts minimum must be 6.`,
          { journeyId: JOURNEY_ID, actualMinimum: contracts.minimum },
        ),
      );
    }
    if (contracts.maximum !== 10) {
      issues.push(
        issue(
          'error',
          'contracts-maximum-mismatch',
          `${JOURNEY_ID} contracts maximum must be 10.`,
          { journeyId: JOURNEY_ID, actualMaximum: contracts.maximum },
        ),
      );
    }
    if (contracts.default < 6 || contracts.default > 10) {
      issues.push(
        issue(
          'error',
          'contracts-default-out-of-range',
          `${JOURNEY_ID} contracts default must stay within 6-10.`,
          { journeyId: JOURNEY_ID, actualDefault: contracts.default },
        ),
      );
    }
  }

  return {
    journeyId: journey.id,
    tiers: journey.tiers,
    contracts,
    knownLimitations: journey.knownLimitations ?? [],
  };
}

function validateOrderedCheckpoints(flow, issues) {
  const actual = flow.checkpoints.map((checkpoint) => checkpoint.id);
  let cursor = 0;
  for (const expected of EXPECTED_CHECKPOINT_IDS) {
    const index = actual.indexOf(expected, cursor);
    if (index === -1) {
      issues.push(
        issue(
          'error',
          'ui-flow-checkpoint-missing',
          `${JOURNEY_ID} UI flow is missing required checkpoint ${expected}.`,
          { journeyId: JOURNEY_ID, checkpointId: expected },
        ),
      );
      continue;
    }
    cursor = index + 1;
  }
}

function validateUiFlow(uiFlowShell, issues) {
  const matches = uiFlowShell.flows.filter(
    (flow) => flow.journeyId === JOURNEY_ID,
  );
  if (matches.length !== 1) {
    issues.push(
      issue(
        'error',
        'ui-flow-cardinality',
        `Expected exactly one ${JOURNEY_ID} UI flow; found ${matches.length}.`,
        { journeyId: JOURNEY_ID },
      ),
    );
    return null;
  }

  const flow = matches[0];
  if (!flow.qcCommand.includes('qc:campaign-long:stability')) {
    issues.push(
      issue(
        'error',
        'ui-flow-command-missing',
        `${JOURNEY_ID} UI flow must point at qc:campaign-long:stability.`,
        { journeyId: JOURNEY_ID },
      ),
    );
  }
  for (const token of ['--seed=42', '--contracts=10', '--runs=2']) {
    if (!flow.qcCommand.includes(token)) {
      issues.push(
        issue(
          'error',
          'ui-flow-command-token-missing',
          `${JOURNEY_ID} UI flow command must include ${token}.`,
          { journeyId: JOURNEY_ID, token },
        ),
      );
    }
  }
  validateOrderedCheckpoints(flow, issues);

  return {
    journeyId: flow.journeyId,
    qcCommand: flow.qcCommand,
    checkpointIds: flow.checkpoints.map((checkpoint) => checkpoint.id),
  };
}

function validateGraph(graph, issues) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const requiredNodes = [
    'journey:campaign-long',
    'command:qc-campaign-long-stability',
    'command:qc-campaign-long-validate',
    'command:verify-qc-campaign-long',
    'log-event:campaign.stability_checked',
    'log-event:campaign.stability_drift_detected',
  ];
  for (const nodeId of requiredNodes) {
    if (!nodeIds.has(nodeId)) {
      issues.push(
        issue(
          'error',
          'graph-node-missing',
          `QC validation graph missing node ${nodeId}.`,
          { nodeId },
        ),
      );
    }
  }

  const edgeKey = (from, to, relation) => `${from}\u0000${to}\u0000${relation}`;
  const edgeSet = new Set(
    graph.edges.map((edge) => edgeKey(edge.from, edge.to, edge.relation)),
  );
  const requiredEdges = [
    [
      'journey:campaign-long',
      'command:qc-campaign-long-stability',
      'validated-by',
    ],
    [
      'journey:campaign-long',
      'command:qc-campaign-long-validate',
      'validated-by',
    ],
    [
      'journey:campaign-long',
      'command:verify-qc-campaign-long',
      'validated-by',
    ],
  ];
  for (const [from, to, relation] of requiredEdges) {
    if (!edgeSet.has(edgeKey(from, to, relation))) {
      issues.push(
        issue(
          'error',
          'graph-edge-missing',
          `QC validation graph missing ${relation} edge ${from} -> ${to}.`,
          { from, to, relation },
        ),
      );
    }
  }

  return {
    requiredNodeCount: requiredNodes.length,
    requiredEdgeCount: requiredEdges.length,
  };
}

function validateSourceAnchor(anchor, issues) {
  const absolutePath = path.join(repoRoot, anchor.path);
  if (!fs.existsSync(absolutePath)) {
    issues.push(
      issue(
        'error',
        'source-anchor-missing',
        `Required long-campaign source anchor ${anchor.path} is missing.`,
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

  const text = fs.readFileSync(absolutePath, 'utf8');
  for (const token of anchor.tokens) {
    if (!text.includes(token)) {
      issues.push(
        issue(
          'error',
          'source-anchor-token-missing',
          `${anchor.id} (${anchor.path}) must contain long-campaign QC token ${token}.`,
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

function loadSourceAnchors() {
  if (!sourceAnchorsPath) return defaultSourceAnchors;
  return loadJson(sourceAnchorsPath);
}

function buildManifest() {
  const issues = [];
  const registry = loadJson(registryPath);
  const packageJson = loadJson(packageJsonPath);
  const catalog = loadJson(journeyCatalogPath);
  const uiFlowShell = loadJson(uiFlowShellPath);
  const graph = loadJson(validationGraphPath);
  const sourceAnchors = loadSourceAnchors();

  const packageScripts = validatePackageScripts(packageJson, issues);
  const surface = validateSurface(registry, issues);
  const journey = validateJourneyCatalog(catalog, issues);
  const uiFlow = validateUiFlow(uiFlowShell, issues);
  const graphSummary = validateGraph(graph, issues);
  const anchors = sourceAnchors.map((anchor) =>
    validateSourceAnchor(anchor, issues),
  );

  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');

  return {
    version: 1,
    status: errors.length > 0 ? 'fail' : 'pass',
    registryPath: toRepoRelative(registryPath),
    packageJsonPath: toRepoRelative(packageJsonPath),
    journeyCatalogPath: toRepoRelative(journeyCatalogPath),
    uiFlowShellPath: toRepoRelative(uiFlowShellPath),
    validationGraphPath: toRepoRelative(validationGraphPath),
    journeyId: JOURNEY_ID,
    surface,
    packageScripts,
    journey,
    uiFlow,
    graph: graphSummary,
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
    `[qc:campaign-long] surfaces=${manifest.surface ? '1/1' : '0/1'} packageScripts=${manifest.packageScripts.length}/${requiredPackageScripts.length} journey=${manifest.journey ? '1/1' : '0/1'} uiFlow=${manifest.uiFlow ? '1/1' : '0/1'} graphNodes=${manifest.graph.requiredNodeCount} anchors=${manifest.anchors.length} errors=${manifest.errors.length} warnings=${manifest.warnings.length}`,
  );
}

process.exit(manifest.errors.length > 0 ? 1 : 0);
