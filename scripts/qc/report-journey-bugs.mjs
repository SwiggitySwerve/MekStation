#!/usr/bin/env node
import { filterBugs, loadRunEvidence, parseArgs } from './journey-qc-core.mjs';

function compactStateBefore(state) {
  if (!state || typeof state !== 'object') return '-';
  return [
    state.runId ? `run=${state.runId}` : null,
    state.journeyId ? `journey=${state.journeyId}` : null,
    state.stepId ? `step=${state.stepId}` : null,
    state.attempt !== undefined ? `attempt=${state.attempt}` : null,
    state.module ? `module=${state.module}` : null,
    state.expectedTerminalState
      ? `expected=${state.expectedTerminalState}`
      : null,
    state.severityGate ? `severityGate=${state.severityGate}` : null,
    state.parameterHash ? `parameterHash=${state.parameterHash}` : null,
    Array.isArray(state.journeyIds)
      ? `journeys=${state.journeyIds.join(',')}`
      : null,
  ]
    .filter(Boolean)
    .join(' ');
}

function compactStateAfter(state) {
  if (!state || typeof state !== 'object') return '-';
  return [
    state.status ? `status=${state.status}` : null,
    state.terminalState ? `terminal=${state.terminalState}` : null,
    state.artifactCount !== undefined
      ? `artifacts=${state.artifactCount}`
      : null,
    state.executionBacking ? `backing=${state.executionBacking}` : null,
    state.syntheticBacking !== undefined
      ? `synthetic=${state.syntheticBacking}`
      : null,
    state.executionEvidenceSource
      ? `source=${state.executionEvidenceSource}`
      : null,
    state.bugCount !== undefined ? `bugs=${state.bugCount}` : null,
    state.gatedBugCount !== undefined ? `gated=${state.gatedBugCount}` : null,
    state.highestSeverity ? `highest=${state.highestSeverity}` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

function compactRuleDecision(ruleDecision) {
  if (!ruleDecision) return '-';
  return [
    ruleDecision.outcome ?? '-',
    ruleDecision.source ? `via ${ruleDecision.source}` : null,
    ruleDecision.reason ? `- ${ruleDecision.reason}` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

function compactValidation(validationResult) {
  if (!validationResult) return '-';
  return [
    validationResult.status ?? '-',
    validationResult.event ? `event=${validationResult.event}` : null,
    validationResult.required !== undefined
      ? `required=${validationResult.required}`
      : null,
    validationResult.failureKind
      ? `failureKind=${validationResult.failureKind}`
      : null,
    validationResult.severityGate
      ? `severityGate=${validationResult.severityGate}`
      : null,
  ]
    .filter(Boolean)
    .join(' ');
}

const options = parseArgs(process.argv.slice(2));
const evidence = loadRunEvidence({
  evidenceDir: options.evidenceDir,
  runId: options.since ?? options.runId ?? 'latest',
});
const bugs = filterBugs(evidence.bugs, options);

if (options.json) {
  console.log(JSON.stringify(bugs, null, 2));
} else {
  console.log(`# Journey bugs (${bugs.length})`);
  for (const bug of bugs) {
    console.log(`- [${bug.severity}] ${bug.journeyId}: ${bug.summary}`);
    console.log(`  fingerprint: ${bug.fingerprint}`);
    console.log(`  evidence: ${(bug.evidenceRefs ?? []).join(', ') || 'none'}`);
    if (bug.triage) {
      console.log(`  actor: ${bug.triage.actor ?? '-'}`);
      console.log(`  action: ${bug.triage.action ?? '-'}`);
      console.log(
        `  state before: ${compactStateBefore(bug.triage.stateBefore)}`,
      );
      console.log(`  state after: ${compactStateAfter(bug.triage.stateAfter)}`);
      console.log(`  rule: ${compactRuleDecision(bug.triage.ruleDecision)}`);
      console.log(
        `  validation: ${compactValidation(bug.triage.validationResult)}`,
      );
      if ((bug.triage.warnings ?? []).length > 0) {
        console.log(`  warnings: ${bug.triage.warnings.join(' | ')}`);
      }
      if (bug.triage.failureCause) {
        console.log(`  failure cause: ${bug.triage.failureCause}`);
      }
      if (bug.triage.nextDebuggingHint) {
        console.log(`  next: ${bug.triage.nextDebuggingHint}`);
      }
      const logFingerprints = bug.triage.logFingerprints ?? [];
      if (logFingerprints.length > 0) {
        console.log(`  logs: ${logFingerprints.join(', ')}`);
      }
    }
  }
}

process.exit(0);
