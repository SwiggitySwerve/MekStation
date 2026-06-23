#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  loadJourneyArtifacts,
  loadJsonFile,
  parseArgs,
  repoRoot,
  runJourney,
  toRepoRelative,
  writeJsonFile,
} from './journey-qc-core.mjs';

const JOURNEY_ID = 'campaign-long';
const MODULE_ID = 'campaign';
const EXPECTED_TERMINAL_STATE = 'campaign-sequence-complete';
const DEFAULT_CONTRACTS = 10;
const DEFAULT_RUNS = 2;
const ARTIFACT_ROLES = [
  {
    role: 'campaign-sequence',
    stepId: 'generate-long-sequence',
    relativePath: 'generated/campaign-sequence.json',
  },
  {
    role: 'campaign-result',
    stepId: 'resolve-long-campaign',
    relativePath: 'artifacts/campaign-result.json',
  },
  {
    role: 'campaign-economy',
    stepId: 'process-long-economy',
    relativePath: 'artifacts/campaign-economy.json',
  },
];

function hashString(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

function normalizeForStability(value) {
  return normalizeValue(value);
}

function normalizeValue(value, key = '') {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, key));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([nestedKey, nestedValue]) => [
          nestedKey,
          normalizeValue(nestedValue, nestedKey),
        ]),
    );
  }
  if (
    [
      'attempt',
      'completedAt',
      'createdAt',
      'generatedId',
      'runId',
      'startedAt',
      'timestamp',
    ].includes(key)
  ) {
    return `<${key}>`;
  }
  if (typeof value === 'string') {
    return value
      .replace(/contract-[a-f0-9]{8}-(\d+)/gi, 'contract-<generated-id>-$1')
      .replace(/\b[a-f0-9]{8}\b/gi, '<generated-id>')
      .replace(/campaign-long\/\d+\//g, 'campaign-long/<attempt>/');
  }
  return value;
}

function stableDigest(value) {
  return hashString(JSON.stringify(canonicalize(normalizeForStability(value))));
}

function parseRawArgs(argv) {
  const values = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function stabilityOptions(argv) {
  const raw = parseRawArgs(argv);
  const options = parseArgs(argv);
  options.journey = JOURNEY_ID;
  options.tier = raw.tier ?? 'extended';
  options.runs = raw.runs ? options.runs : DEFAULT_RUNS;
  options.parameters = {
    ...options.parameters,
    contracts: raw.contracts ?? String(DEFAULT_CONTRACTS),
  };
  const contracts = Number.parseInt(options.parameters.contracts, 10);
  if (!Number.isInteger(contracts) || contracts < 6 || contracts > 10) {
    throw new Error(
      `Long-campaign stability requires --contracts between 6 and 10; received ${options.parameters.contracts}.`,
    );
  }
  if (!Number.isInteger(options.runs) || options.runs < 2) {
    throw new Error(
      `Long-campaign stability requires --runs >= 2; received ${options.runs}.`,
    );
  }
  return {
    options,
    contracts,
    injectStabilityDrift:
      raw['inject-stability-drift'] ?? raw['inject-drift'] ?? null,
  };
}

function readJsonArtifact(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveRoundTripCheck(filePath, label) {
  try {
    const original = readJsonArtifact(filePath);
    const roundTripped = JSON.parse(JSON.stringify(original));
    const originalDigest = stableDigest(original);
    const roundTripDigest = stableDigest(roundTripped);
    return {
      label,
      path: toRepoRelative(filePath),
      status: originalDigest === roundTripDigest ? 'pass' : 'fail',
      originalDigest,
      roundTripDigest,
      error:
        originalDigest === roundTripDigest
          ? undefined
          : 'Canonical digest changed after parse/stringify round trip.',
    };
  } catch (error) {
    return {
      label,
      path: toRepoRelative(filePath),
      status: 'fail',
      error: error.message,
    };
  }
}

function shouldInjectDrift(rawInjection, role, attempt) {
  if (!rawInjection) return false;
  if (rawInjection === 'all') return attempt > 1;
  const [injectedRole, injectedAttempt] = rawInjection.split(':');
  if (injectedRole !== role) return false;
  return injectedAttempt
    ? Number.parseInt(injectedAttempt, 10) === attempt
    : attempt > 1;
}

function compareArtifacts(runDir, runs, injectStabilityDrift) {
  const comparisons = [];
  const drift = [];

  for (const artifactRole of ARTIFACT_ROLES) {
    let baselineDigest = null;
    const attempts = [];

    for (let attempt = 1; attempt <= runs; attempt += 1) {
      const filePath = path.join(
        runDir,
        JOURNEY_ID,
        String(attempt),
        artifactRole.relativePath,
      );
      if (!fs.existsSync(filePath)) {
        const entry = {
          role: artifactRole.role,
          stepId: artifactRole.stepId,
          attempt,
          status: 'missing',
          path: toRepoRelative(filePath),
        };
        attempts.push(entry);
        drift.push({
          type: 'missing-artifact',
          role: artifactRole.role,
          stepId: artifactRole.stepId,
          attempt,
          expectedPath: entry.path,
          summary: `${artifactRole.role} artifact missing for attempt ${attempt}.`,
        });
        continue;
      }

      const payload = readJsonArtifact(filePath);
      const normalized = normalizeForStability(payload);
      if (shouldInjectDrift(injectStabilityDrift, artifactRole.role, attempt)) {
        normalized.__injectedStabilityDrift = true;
      }
      const digest = hashString(JSON.stringify(canonicalize(normalized)));
      if (baselineDigest === null) baselineDigest = digest;
      const status = digest === baselineDigest ? 'pass' : 'drift';
      const entry = {
        role: artifactRole.role,
        stepId: artifactRole.stepId,
        attempt,
        status,
        digest,
        baselineDigest,
        path: toRepoRelative(filePath),
      };
      attempts.push(entry);
      if (status === 'drift') {
        drift.push({
          type: 'digest-mismatch',
          role: artifactRole.role,
          stepId: artifactRole.stepId,
          attempt,
          baselineAttempt: 1,
          baselineDigest,
          actualDigest: digest,
          evidenceRef: entry.path,
          summary: `${artifactRole.role} digest drifted on attempt ${attempt}.`,
        });
      }
    }

    comparisons.push({
      role: artifactRole.role,
      stepId: artifactRole.stepId,
      baselineDigest,
      attempts,
    });
  }

  return { comparisons, drift };
}

function collectRoundTrips(runDir, runs) {
  const checks = [
    saveRoundTripCheck(path.join(runDir, 'run-plan.json'), 'run-plan'),
    saveRoundTripCheck(path.join(runDir, 'result.json'), 'result'),
  ];
  for (const artifactRole of ARTIFACT_ROLES) {
    for (let attempt = 1; attempt <= runs; attempt += 1) {
      checks.push(
        saveRoundTripCheck(
          path.join(
            runDir,
            JOURNEY_ID,
            String(attempt),
            artifactRole.relativePath,
          ),
          `${artifactRole.role}:attempt-${attempt}`,
        ),
      );
    }
  }
  return checks;
}

function collectUiFlowEvidence() {
  const { uiFlowShell } = loadJourneyArtifacts();
  const matchingFlows = uiFlowShell.flows.filter(
    (flow) => flow.journeyId === JOURNEY_ID,
  );
  const flow = matchingFlows[0] ?? null;
  const issues = [];
  if (matchingFlows.length !== 1) {
    issues.push(
      `Expected exactly one ${JOURNEY_ID} UI flow; found ${matchingFlows.length}.`,
    );
  }
  if (flow && !flow.qcCommand.includes('qc:campaign-long:stability')) {
    issues.push(
      `${JOURNEY_ID} UI flow must point at qc:campaign-long:stability.`,
    );
  }
  return {
    status: issues.length === 0 ? 'pass' : 'fail',
    journeyId: JOURNEY_ID,
    browserExecuted: false,
    boundary:
      'Headless stability gate records UI checkpoints; browser campaign signoff remains a separate lane.',
    issues,
    qcCommand: flow?.qcCommand ?? null,
    checkpoints:
      flow?.checkpoints?.map((checkpoint) => ({
        id: checkpoint.id,
        label: checkpoint.label,
        href: checkpoint.href,
        visibility: checkpoint.visibility,
      })) ?? [],
    inspectionNotes: flow?.inspectionNotes ?? [],
  };
}

function campaignResult(result) {
  return result.journeys?.find((journey) => journey.id === JOURNEY_ID) ?? null;
}

function terminalStateIssues(result) {
  const journey = campaignResult(result);
  if (!journey) return [`${JOURNEY_ID} result was not present.`];
  const issues = [];
  for (const attempt of journey.attempts ?? []) {
    if (attempt.status !== 'pass') {
      issues.push(`Attempt ${attempt.attempt} status is ${attempt.status}.`);
    }
    if (attempt.terminalState !== EXPECTED_TERMINAL_STATE) {
      issues.push(
        `Attempt ${attempt.attempt} terminal state is ${attempt.terminalState}; expected ${EXPECTED_TERMINAL_STATE}.`,
      );
    }
  }
  return issues;
}

function stabilityLog({ runId, event, level, message, blocking, metadata }) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'journey.campaign',
    event,
    message,
    ...(level === 'error'
      ? { classification: 'failure' }
      : level === 'warn'
        ? { classification: 'actionable-warning' }
        : {}),
    ...(typeof blocking === 'boolean' ? { blocking } : {}),
    runId,
    journeyId: JOURNEY_ID,
    entityIds: {
      module: MODULE_ID,
    },
    metadata,
  };
  return {
    ...entry,
    fingerprint: hashString(
      `${entry.service}:${entry.event}:${entry.message}:${JSON.stringify(metadata ?? {})}`,
    ),
  };
}

function bugFromFailure(runId, failure, event, evidenceRefs = []) {
  const triage = {
    actor: 'campaign-stability-gate',
    action: event,
    stateBefore: {
      journeyId: JOURNEY_ID,
      artifactRole: failure.role ?? failure.label ?? null,
    },
    stateAfter: {
      status: 'fail',
      driftType: failure.type ?? event,
    },
    ruleDecision: {
      outcome: 'rejected',
      reason:
        failure.summary ?? failure.error ?? 'Long-campaign stability failed.',
    },
    validationResult: {
      status: 'fail',
      event,
    },
    warnings: [],
    failureCause:
      failure.summary ?? failure.error ?? 'Long-campaign stability failed.',
    evidenceRefs,
    nextDebuggingHint:
      'Inspect stability-manifest.json, compare the named artifact attempts, then rerun qc:campaign-long:stability with the same seed and parameters.',
  };
  return {
    severity: 'high',
    journeyId: JOURNEY_ID,
    runId,
    stepId: failure.stepId ?? null,
    module: MODULE_ID,
    fingerprint: hashString(
      `${runId}:${event}:${failure.role ?? failure.label ?? ''}:${failure.attempt ?? ''}:${failure.summary ?? failure.error ?? ''}`,
    ),
    summary:
      failure.summary ?? failure.error ?? 'Long-campaign stability failed.',
    evidenceRefs,
    triage,
  };
}

function appendJsonArray(filePath, entries) {
  const existing = fs.existsSync(filePath) ? loadJsonFile(filePath) : [];
  writeJsonFile(filePath, [...existing, ...entries]);
}

function appendNdjson(filePath, entries) {
  if (entries.length === 0) return;
  fs.appendFileSync(
    filePath,
    entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
  );
}

function appendReport(runDir, manifest) {
  const lines = [
    '',
    '## Long Campaign Stability',
    '',
    `- Status: ${manifest.status}`,
    `- Compared artifact roles: ${manifest.artifactComparisons.length}`,
    `- Drift entries: ${manifest.drift.length}`,
    `- Save round trips: ${manifest.saveRoundTrips.filter((entry) => entry.status === 'pass').length}/${manifest.saveRoundTrips.length}`,
    `- UI flow linkage: ${manifest.uiFlow.status}`,
    `- Browser executed: ${manifest.uiFlow.browserExecuted ? 'yes' : 'no'}`,
    '',
  ];
  fs.appendFileSync(path.join(runDir, 'report.md'), lines.join('\n'));
}

function buildManifest({ output, contracts, injectStabilityDrift }) {
  const runDir = path.resolve(repoRoot, output.runPlan.evidenceDir);
  const { comparisons, drift } = compareArtifacts(
    runDir,
    output.runPlan.runs,
    injectStabilityDrift,
  );
  const saveRoundTrips = collectRoundTrips(runDir, output.runPlan.runs);
  const uiFlow = collectUiFlowEvidence();
  const terminalIssues = terminalStateIssues(output.result);
  const saveFailures = saveRoundTrips.filter(
    (entry) => entry.status !== 'pass',
  );
  const status =
    output.result.status === 'pass' &&
    drift.length === 0 &&
    saveFailures.length === 0 &&
    uiFlow.status === 'pass' &&
    terminalIssues.length === 0
      ? 'pass'
      : 'fail';

  return {
    version: 1,
    status,
    runId: output.runPlan.runId,
    journeyId: JOURNEY_ID,
    generatedAt: new Date().toISOString(),
    seed: output.runPlan.seed,
    tier: output.runPlan.tier,
    mode: output.runPlan.mode,
    runs: output.runPlan.runs,
    contracts,
    expectedTerminalState: EXPECTED_TERMINAL_STATE,
    terminalStateIssues: terminalIssues,
    artifactComparisons: comparisons,
    drift,
    saveRoundTrips,
    executionBackingSummary: output.result.executionBackingSummary,
    knownLimitations: campaignResult(output.result)?.knownLimitations ?? [],
    uiFlow,
    evidenceRefs: {
      runPlan: toRepoRelative(path.join(runDir, 'run-plan.json')),
      result: toRepoRelative(path.join(runDir, 'result.json')),
      bugs: toRepoRelative(path.join(runDir, 'bugs.json')),
      logs: toRepoRelative(path.join(runDir, 'system.ndjson')),
      report: toRepoRelative(path.join(runDir, 'report.md')),
      manifest: toRepoRelative(path.join(runDir, 'stability-manifest.json')),
    },
  };
}

function failureBugsAndLogs(manifest) {
  const bugs = [];
  const logs = [];
  const manifestRef = manifest.evidenceRefs.manifest;

  for (const driftEntry of manifest.drift) {
    const log = stabilityLog({
      runId: manifest.runId,
      event: 'campaign.stability_drift_detected',
      level: 'error',
      message: driftEntry.summary,
      blocking: true,
      metadata: {
        drift: driftEntry,
        triage: {
          actor: 'campaign-stability-gate',
          action: 'compare-normalized-campaign-artifacts',
          stateBefore: {
            journeyId: JOURNEY_ID,
            artifactRole: driftEntry.role,
            baselineDigest: driftEntry.baselineDigest,
          },
          stateAfter: {
            status: 'fail',
            actualDigest: driftEntry.actualDigest ?? null,
          },
          ruleDecision: {
            outcome: 'rejected',
            reason: driftEntry.summary,
          },
          validationResult: {
            status: 'fail',
            event: 'campaign.stability_drift_detected',
          },
          warnings: [],
          failureCause: driftEntry.summary,
          evidenceRefs: [manifestRef, driftEntry.evidenceRef].filter(Boolean),
          nextDebuggingHint:
            'Compare the named long-campaign artifact attempts and rerun with the same seed.',
        },
      },
    });
    logs.push(log);
    bugs.push(
      bugFromFailure(
        manifest.runId,
        driftEntry,
        'campaign.stability_drift_detected',
        [
          manifestRef,
          driftEntry.evidenceRef,
          `system.ndjson#${log.fingerprint}`,
        ].filter(Boolean),
      ),
    );
  }

  for (const saveFailure of manifest.saveRoundTrips.filter(
    (entry) => entry.status !== 'pass',
  )) {
    const failure = {
      ...saveFailure,
      summary: `Save round-trip failed for ${saveFailure.label}.`,
    };
    const log = stabilityLog({
      runId: manifest.runId,
      event: 'campaign.save_round_trip_failed',
      level: 'error',
      message: failure.summary,
      blocking: true,
      metadata: {
        saveRoundTrip: saveFailure,
      },
    });
    logs.push(log);
    bugs.push(
      bugFromFailure(
        manifest.runId,
        failure,
        'campaign.save_round_trip_failed',
        [manifestRef, saveFailure.path, `system.ndjson#${log.fingerprint}`],
      ),
    );
  }

  if (manifest.uiFlow.status !== 'pass') {
    const failure = {
      label: 'ui-flow-linkage',
      summary: manifest.uiFlow.issues.join(' '),
    };
    const log = stabilityLog({
      runId: manifest.runId,
      event: 'campaign.ui_flow_linkage_failed',
      level: 'error',
      message: failure.summary,
      blocking: true,
      metadata: {
        uiFlow: manifest.uiFlow,
      },
    });
    logs.push(log);
    bugs.push(
      bugFromFailure(
        manifest.runId,
        failure,
        'campaign.ui_flow_linkage_failed',
        [manifestRef, `system.ndjson#${log.fingerprint}`],
      ),
    );
  }

  for (const issue of manifest.terminalStateIssues) {
    const failure = {
      label: 'terminal-state',
      summary: issue,
    };
    const log = stabilityLog({
      runId: manifest.runId,
      event: 'campaign.terminal_state_failed',
      level: 'error',
      message: issue,
      blocking: true,
      metadata: {
        terminalStateIssue: issue,
      },
    });
    logs.push(log);
    bugs.push(
      bugFromFailure(
        manifest.runId,
        failure,
        'campaign.terminal_state_failed',
        [manifestRef, `system.ndjson#${log.fingerprint}`],
      ),
    );
  }

  return { bugs, logs };
}

function successLog(manifest) {
  return stabilityLog({
    runId: manifest.runId,
    event: 'campaign.stability_checked',
    level: 'info',
    message: 'Long campaign stability gate completed without drift.',
    blocking: false,
    metadata: {
      artifactRoles: manifest.artifactComparisons.map((entry) => entry.role),
      runs: manifest.runs,
      contracts: manifest.contracts,
      uiFlow: {
        browserExecuted: manifest.uiFlow.browserExecuted,
        checkpointCount: manifest.uiFlow.checkpoints.length,
      },
    },
  });
}

function run(argv) {
  const { options, contracts, injectStabilityDrift } = stabilityOptions(argv);
  const output = runJourney(options);
  const runDir = path.resolve(repoRoot, output.runPlan.evidenceDir);
  const manifest = buildManifest({ output, contracts, injectStabilityDrift });
  const manifestPath = path.join(runDir, 'stability-manifest.json');
  writeJsonFile(manifestPath, manifest);

  const { bugs, logs } = failureBugsAndLogs(manifest);
  const allLogs = manifest.status === 'pass' ? [successLog(manifest)] : logs;
  appendJsonArray(path.join(runDir, 'bugs.json'), bugs);
  appendNdjson(path.join(runDir, 'system.ndjson'), allLogs);
  appendReport(runDir, manifest);

  console.log(`[qc:campaign-long:stability] run: ${manifest.runId}`);
  console.log(`[qc:campaign-long:stability] status: ${manifest.status}`);
  console.log(
    `[qc:campaign-long:stability] evidence: ${toRepoRelative(runDir)}`,
  );
  console.log(
    `[qc:campaign-long:stability] manifest: ${toRepoRelative(manifestPath)}`,
  );
  console.log(
    `[qc:campaign-long:stability] drift entries: ${manifest.drift.length}`,
  );
  console.log(
    `[qc:campaign-long:stability] stability bug candidates: ${bugs.length}`,
  );

  return manifest.status === 'pass' && output.gatedBugCount === 0 ? 0 : 1;
}

try {
  process.exit(run(process.argv.slice(2)));
} catch (error) {
  console.error(`[qc:campaign-long:stability] ${error.message}`);
  process.exit(1);
}
