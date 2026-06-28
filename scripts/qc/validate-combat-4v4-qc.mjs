#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

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
const sourceAnchorsPath =
  process.env.MEKSTATION_COMBAT_4V4_QC_ANCHORS_PATH ?? null;

const JOURNEY_ID = 'combat-4v4';
const PROOF_COMMAND = 'npm.cmd run verify:qc:combat-4v4';
const JOURNEY_SELECTOR = '--journey=combat-4v4';

const requiredPackageScripts = [
  {
    id: 'qc:combat-4v4:validate',
    tokens: ['validate-combat-4v4-qc.mjs'],
  },
  {
    id: 'verify:qc:combat-4v4',
    tokens: [
      'qc:combat-4v4:validate',
      'combat4v4JourneyProof.test.ts',
      '--journey=combat-4v4',
      '--player-units=4',
      '--opponent-units=4',
      '--require-domain-backed',
    ],
  },
  {
    id: 'verify:qc',
    tokens: ['verify:qc:combat-4v4'],
  },
];

const defaultSourceAnchors = [
  {
    id: 'combat-4v4-proof-test',
    path: 'src/__tests__/integration/combat4v4JourneyProof.test.ts',
    tokens: [
      'runLanceMatch',
      'GameEngine',
      'runToCompletion',
      'buildLance',
      'expect(players).toHaveLength(4)',
      'expect(opponents).toHaveLength(4)',
      'GameStatus.Completed',
      'GameEventType.GameEnded',
      'derivePostBattleReport',
      'writeSwarmEventLog',
      'buildSwarmManifestEntry',
      'appendManifestEntry',
      'readReplayIndex',
    ],
  },
  {
    id: 'combat-4v4-journey-catalog',
    path: 'docs/qc/mekstation-journey-scenarios.json',
    tokens: [
      '"id": "combat-4v4"',
      '"expectedTerminalState": "combat-complete"',
      '"player-units": { "type": "integer", "default": 4',
      '"opponent-units": { "type": "integer", "default": 4',
      '"executionBacking": "domain-command"',
      '"syntheticBacking": false',
      '"executionEvidenceSource": "package:verify:qc:combat-4v4"',
      '"npm.cmd run verify:qc:combat-4v4"',
    ],
  },
  {
    id: 'combat-4v4-ui-flow',
    path: 'src/qc/gameplayUiFlowShell.json',
    tokens: [
      '"journeyId": "combat-4v4"',
      '"qcCommand": "npm.cmd run verify:qc:combat-4v4 -- --journey=combat-4v4"',
      '"id": "force-build"',
      '"id": "tactical-combat"',
      '"id": "replay"',
    ],
  },
];

function parseArgs(argv) {
  return { json: argv.includes('--json') };
}

function issue(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
  const playerUnits = journey.parameters?.['player-units'];
  const opponentUnits = journey.parameters?.['opponent-units'];
  const steps = journey.steps ?? [];

  if (journey.expectedTerminalState !== 'combat-complete') {
    issues.push(
      issue(
        'error',
        'journey-terminal-state-mismatch',
        `${JOURNEY_ID} must terminate at combat-complete.`,
        { journeyId: JOURNEY_ID },
      ),
    );
  }
  if (playerUnits?.default !== 4 || opponentUnits?.default !== 4) {
    issues.push(
      issue(
        'error',
        'lance-size-default-mismatch',
        `${JOURNEY_ID} must default to four player and four opponent units.`,
        {
          journeyId: JOURNEY_ID,
          playerDefault: playerUnits?.default,
          opponentDefault: opponentUnits?.default,
        },
      ),
    );
  }
  if (steps.length !== 3) {
    issues.push(
      issue(
        'error',
        'journey-step-count-mismatch',
        `${JOURNEY_ID} must keep launch, terminal combat, and replay steps.`,
        { journeyId: JOURNEY_ID, actualStepCount: steps.length },
      ),
    );
  }

  for (const step of steps) {
    if (step.executionBacking === 'synthetic-projection') {
      issues.push(
        issue(
          'error',
          'synthetic-execution-backing',
          `${JOURNEY_ID}/${step.id} must not use synthetic-projection backing.`,
          { journeyId: JOURNEY_ID, stepId: step.id },
        ),
      );
    }
    if (step.syntheticBacking !== false) {
      issues.push(
        issue(
          'error',
          'step-synthetic-backing',
          `${JOURNEY_ID}/${step.id} must declare syntheticBacking=false.`,
          { journeyId: JOURNEY_ID, stepId: step.id },
        ),
      );
    }
    if (step.executionEvidenceSource !== 'package:verify:qc:combat-4v4') {
      issues.push(
        issue(
          'error',
          'step-evidence-source-mismatch',
          `${JOURNEY_ID}/${step.id} must point at package:verify:qc:combat-4v4.`,
          { journeyId: JOURNEY_ID, stepId: step.id },
        ),
      );
    }
    if (!step.executionProofCommands?.includes(PROOF_COMMAND)) {
      issues.push(
        issue(
          'error',
          'step-proof-command-missing',
          `${JOURNEY_ID}/${step.id} must include ${PROOF_COMMAND}.`,
          { journeyId: JOURNEY_ID, stepId: step.id },
        ),
      );
    }
  }

  return {
    journeyId: journey.id,
    stepIds: steps.map((step) => step.id),
    playerUnits,
    opponentUnits,
  };
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
  if (!flow.qcCommand.includes(PROOF_COMMAND)) {
    issues.push(
      issue(
        'error',
        'ui-flow-command-mismatch',
        `${JOURNEY_ID} UI flow must include ${PROOF_COMMAND}.`,
        { journeyId: JOURNEY_ID, actualCommand: flow.qcCommand },
      ),
    );
  }
  if (!flow.qcCommand.includes(JOURNEY_SELECTOR)) {
    issues.push(
      issue(
        'error',
        'ui-flow-journey-selector-missing',
        `${JOURNEY_ID} UI flow must include ${JOURNEY_SELECTOR}.`,
        { journeyId: JOURNEY_ID, actualCommand: flow.qcCommand },
      ),
    );
  }

  const expectedCheckpoints = [
    'force-build',
    'encounter-create',
    'pre-battle',
    'tactical-combat',
    'gm-review',
    'replay',
  ];
  const actual = flow.checkpoints.map((checkpoint) => checkpoint.id);
  for (const checkpointId of expectedCheckpoints) {
    if (!actual.includes(checkpointId)) {
      issues.push(
        issue(
          'error',
          'ui-flow-checkpoint-missing',
          `${JOURNEY_ID} UI flow is missing checkpoint ${checkpointId}.`,
          { journeyId: JOURNEY_ID, checkpointId },
        ),
      );
    }
  }

  return {
    journeyId: flow.journeyId,
    qcCommand: flow.qcCommand,
    checkpointIds: actual,
  };
}

function validateGraph(graph, issues) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const requiredNodes = [
    'journey:combat-4v4',
    'command:qc-combat-4v4-validate',
    'command:verify-qc-combat-4v4',
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
    ['journey:combat-4v4', 'command:qc-combat-4v4-validate', 'validated-by'],
    ['journey:combat-4v4', 'command:verify-qc-combat-4v4', 'validated-by'],
    [
      'command:verify-qc-combat-4v4',
      'command:qc-combat-4v4-validate',
      'contains',
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
        `Required combat-4v4 source anchor ${anchor.path} is missing.`,
        { anchorId: anchor.id, path: anchor.path },
      ),
    );
    return {
      id: anchor.id,
      path: anchor.path,
      tokenCount: anchor.tokens.length,
    };
  }

  const text = fs.readFileSync(absolutePath, 'utf8');
  for (const token of anchor.tokens) {
    if (!text.includes(token)) {
      issues.push(
        issue(
          'error',
          'source-anchor-token-missing',
          `${anchor.id} (${anchor.path}) must contain combat-4v4 QC token ${token}.`,
          { anchorId: anchor.id, path: anchor.path, token },
        ),
      );
    }
  }

  return { id: anchor.id, path: anchor.path, tokenCount: anchor.tokens.length };
}

function loadSourceAnchors() {
  if (!sourceAnchorsPath) return defaultSourceAnchors;
  return loadJson(sourceAnchorsPath);
}

function buildManifest() {
  const issues = [];
  const packageJson = loadJson(packageJsonPath);
  const catalog = loadJson(journeyCatalogPath);
  const uiFlowShell = loadJson(uiFlowShellPath);
  const graph = loadJson(validationGraphPath);
  const sourceAnchors = loadSourceAnchors();

  const manifest = {
    status: 'pass',
    journeyId: JOURNEY_ID,
    packageScripts: validatePackageScripts(packageJson, issues),
    journey: validateJourneyCatalog(catalog, issues),
    uiFlow: validateUiFlow(uiFlowShell, issues),
    graph: validateGraph(graph, issues),
    sourceAnchors: sourceAnchors.map((anchor) =>
      validateSourceAnchor(anchor, issues),
    ),
    issues,
  };
  manifest.status = issues.some((entry) => entry.severity === 'error')
    ? 'fail'
    : 'pass';
  return manifest;
}

function printText(manifest) {
  console.log(
    `[qc:combat-4v4] status=${manifest.status} packageScripts=${manifest.packageScripts.length}/${requiredPackageScripts.length} journey=${manifest.journey ? '1/1' : '0/1'} uiFlow=${manifest.uiFlow ? '1/1' : '0/1'} graphNodes=${manifest.graph.requiredNodeCount} graphEdges=${manifest.graph.requiredEdgeCount} anchors=${manifest.sourceAnchors.length} errors=${manifest.issues.filter((entry) => entry.severity === 'error').length}`,
  );
  for (const entry of manifest.issues) {
    console.log(`[${entry.severity}] ${entry.code}: ${entry.message}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const manifest = buildManifest();
if (args.json) {
  console.log(JSON.stringify(manifest, null, 2));
} else {
  printText(manifest);
}
process.exitCode = manifest.status === 'pass' ? 0 : 1;
