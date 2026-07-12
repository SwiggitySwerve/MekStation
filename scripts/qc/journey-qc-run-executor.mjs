/**
 * Journey QC run-plan execution helpers.
 * Receives runtime deps from journey-qc-core to preserve shared helpers.
 */

function resolveStepFailure(options, journey, step) {
  const injectedFailure =
    options.injectFailure === step.id || options.injectFailure === journey.id;
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
  return { shouldFail, failureKind, failureMessage, missingRequiredBacking };
}

function writeStepArtifacts(input) {
  const { deps, runDir, journey, step, attempt, payload, shouldFail } = input;
  const artifacts = [];
  if (shouldFail) return artifacts;
  for (const produced of step.produces) {
    artifacts.push(
      deps.writeArtifact(runDir, `${journey.id}/${attempt}/${produced}`, payload),
    );
  }
  return artifacts;
}

function buildStepLog(deps, context) {
  const {
    shouldFail,
    failureMessage,
    failureKind,
    missingRequiredBacking,
    level,
    journey,
    step,
    attempt,
    runPlan,
    payload,
    artifacts,
    status,
    event,
  } = context;
  const triage = deps.triageContext({
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
  return deps.logEntry({
    level: shouldFail ? 'error' : level,
    service: deps.serviceForStep(journey, step),
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
      executionProofCommands: step.executionProofCommands,
      triage,
      ...(failureKind ? { failureKind } : {}),
    },
  });
}

function executeJourneyStep(input) {
  const { deps, runDir, runPlan, journey, step, attempt, options, logs } = input;
  const { shouldFail, failureKind, failureMessage, missingRequiredBacking } =
    resolveStepFailure(options, journey, step);
  const level =
    step.loggingPathId === 'tactical-action-rejection' ? 'warn' : 'info';
  const payload = deps.artifactPayload({ runPlan, journey, step, attempt });
  const artifacts = writeStepArtifacts({
    deps,
    runDir,
    journey,
    step,
    attempt,
    payload,
    shouldFail,
  });
  const event = missingRequiredBacking
    ? 'journey.execution_backing_missing'
    : shouldFail
      ? 'journey.step_failed'
      : step.diagnosticEvent;
  const status = shouldFail ? 'fail' : 'pass';
  const stepLog = buildStepLog(deps, {
    shouldFail,
    failureMessage,
    failureKind,
    missingRequiredBacking,
    level,
    journey,
    step,
    attempt,
    runPlan,
    payload,
    artifacts,
    status,
    event,
  });
  logs.push(stepLog);
  return {
    stepResult: {
      id: step.id,
      status,
      artifacts,
      diagnosticEvent: stepLog.event,
      loggingPathId: step.loggingPathId,
      executionBacking: step.executionBacking,
      syntheticBacking: step.syntheticBacking,
      executionEvidenceSource: step.executionEvidenceSource,
      executionProofCommands: step.executionProofCommands,
      failureKind: failureKind ?? undefined,
      error: shouldFail ? stepLog.message : undefined,
    },
    payload,
    shouldFail,
  };
}

function executeJourneyAttempt(input) {
  const { deps, runDir, runPlan, journey, attempt, options, logs } = input;
  const attemptResult = {
    attempt,
    status: 'pass',
    terminalState: null,
    steps: [],
  };
  for (const step of journey.steps) {
    const { stepResult, payload, shouldFail } = executeJourneyStep({
      deps,
      runDir,
      runPlan,
      journey,
      step,
      attempt,
      options,
      logs,
    });
    attemptResult.steps.push(stepResult);
    if (payload.terminalState) attemptResult.terminalState = payload.terminalState;
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
  return attemptResult;
}

function buildDryRunResult(runPlan, startedAt) {
  return {
    logs: [],
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

function appendProbeLogs(deps, logs, runPlan) {
  logs.push(
    deps.logEntry({
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
    deps.logEntry({
      level: 'info',
      service: 'journey.persistence',
      event: 'store.recovery_checked',
      message: 'Journey evidence store recovery path verified.',
      runPlan,
      attempt: 0,
      metadata: { evidenceDir: runPlan.evidenceDir },
    }),
  );
}

export function executeRunPlan(runPlan, options, deps) {
  const runDir = deps.resolveRunDir(runPlan.evidenceDir);
  const logs = [];
  const journeys = [];
  const startedAt = new Date().toISOString();

  if (runPlan.dryRun) return buildDryRunResult(runPlan, startedAt);

  for (const journey of runPlan.journeys) {
    const journeyResult = {
      id: journey.id,
      module: journey.module,
      expectedTerminalState: journey.expectedTerminalState,
      attempts: [],
      knownLimitations: journey.knownLimitations,
    };
    for (let attempt = 1; attempt <= runPlan.runs; attempt += 1) {
      journeyResult.attempts.push(
        executeJourneyAttempt({
          deps,
          runDir,
          runPlan,
          journey,
          attempt,
          options,
          logs,
        }),
      );
    }
    journeys.push(journeyResult);
  }

  appendProbeLogs(deps, logs, runPlan);
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
  result.executionBackingSummary = deps.backingSummary(journeys);
  return { logs, result };
}
