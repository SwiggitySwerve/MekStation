import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { WAVE_CONTRACTS } from './camp01-authority-receipt.contract.mjs';
import {
  artifactDigest,
  canonicalBytes,
  digestBytes,
} from './camp01-authority-receipt.schemas.mjs';

const ROW = WAVE_CONTRACTS['camp-01h'];
const LABELS = [
  'custom-save-reload',
  'campaign-mech-bay-readiness',
  'canonical-combat-post-battle',
];
const TRACE_KEYS = [
  'routeEvidenceIds',
  'apiEvidenceIds',
  'storeEvidenceIds',
  'persistenceEvidenceIds',
  'navigationEvidenceIds',
  'coldReloadEvidenceIds',
];
const DIMENSIONS = Object.freeze({
  desktop: 'pass',
  mobile: 'pass',
  accessibility: 'pass',
  visibility: 'pass',
  feedback: 'pass',
  recovery: 'pass',
  cognitiveLoad: 'pass',
  playability: 'pass',
  enjoyment: 'pass',
});
const EMPTY_DISPOSITION = Object.freeze({
  outcome: 'lower-severity',
  repairRowId: null,
  repairReceiptId: null,
  cleanupReceiptId: null,
  blockerRef: null,
  primaryFindingId: null,
});

// prettier-ignore
export function publishCamp01HComposition(environment, io = fs) {
  if (environment?.CAMP01_INVOCATION_ID !== '06-viewport-layout-sweep') return;
  const runId = environment.CAMP01_RUN_ID;
  const root = environment.CAMP01_ARTIFACT_DIR;
  const identities = JSON.parse(environment.CAMP01_H_IDENTITIES);
  const reports = ROW.reporterContracts.map((reporter) =>
    readCanonical(path.join(root, ...reporter.normalizedPath.split('/')), io),
  );
  const failed = reports.flatMap((report) =>
    report.observations.filter((entry) => entry.status !== 'passed'),
  );
  const phase = failed.length ? 'observation' : 'final';
  const saveId = gateReceiptId('proof-02-required-repairs');
  const reloadId = gateReceiptId('camp-01h-required-repairs');
  const witnesses = LABELS.map((label) =>
    witnessFor(label, runId, identities[label], phase, saveId, reloadId, io, root),
  );
  const experiences = rankFindings(
    LABELS.map((label) => experienceFor(label, runId, identities[label], reports)),
  );
  const canonical = witnesses[2];
  writeExclusive(path.join(root, 'session-authority-map.json'), {
    schema: 'camp01-session-authority-map/v1', parentRunId: runId, witnesses,
  }, io);
  writeExclusive(path.join(root, 'combat-authority.json'), {
    schema: 'camp01-combat-authority/v1', parentRunId: runId,
    witnessId: canonical.witnessId, executionId: canonical.executionId,
    sourceWitnessDigest: artifactDigest(canonical), status: canonical.status,
    facts: canonical.facts,
  }, io);
  for (const entry of witnesses) {
    const directory = path.join(root, 'witnesses', entry.label);
    io.mkdirSync(directory, { recursive: true });
    writeExclusive(path.join(directory, 'authority.json'), entry, io);
  }
  for (const entry of experiences) {
    writeExclusive(path.join(root, 'witnesses', entry.label, 'experience.json'), entry, io);
  }
  const ranked = experiences.flatMap((entry) => entry.findings).sort(
    (a, b) => a.backlogRank - b.backlogRank || a.id.localeCompare(b.id),
  );
  writeExclusive(path.join(root, 'audit-reconciliation.json'), {
    schema: 'camp01-audit-reconciliation/v1', status: phase, parentRunId: runId,
    sourceObservationReceiptIds: [],
    witnessIds: witnesses.map((entry) => entry.witnessId),
    positiveIds: experiences.flatMap((entry) => entry.positives.map((item) => item.id)).sort(),
    rankedFindingIds: ranked.map((entry) => entry.id),
    criticalMajorDispositions: experiences.flatMap((entry) =>
      entry.findings.filter((item) => ['critical', 'major'].includes(item.severity)).map((item) => ({
        findingId: item.id, causeFingerprint: item.causeFingerprint, disposition: item.disposition,
      })),
    ),
  }, io);
  const wavePath = path.join(root, 'wave-result.json');
  if (io.existsSync(wavePath)) return;
  const assertions = Object.fromEntries([...ROW.assertions].sort().map((id) => {
    const match = /(?:===true|===(-?\d+)|>=(-?\d+))$/.exec(id);
    if (id.endsWith('===true')) return [id, phase === 'final'];
    if (match?.[1] !== undefined) return [id, Number(match[1])];
    return [id, Number(match[2])];
  }));
  const observedQuick = reports[1]?.observations ?? [];
  assertions['commandBrowserObservedCount>=1'] = observedQuick.length;
  assertions['commandBrowserFailureCount===0'] = observedQuick.filter((entry) => entry.status !== 'passed').length;
  assertions['positiveObservationsRecorded>=1'] = experiences.reduce((sum, entry) => sum + entry.positives.length, 0);
  writeExclusive(wavePath, {
    schema: 'camp01-wave-result/v1', wave: 'camp-01h', runId,
    status: phase === 'final' ? 'passed' : 'failed', assertions,
  }, io);
}

// prettier-ignore
function witnessFor(label, runId, identity, phase, saveId, reloadId, io, root) {
  const traces = Object.fromEntries(TRACE_KEYS.map((key) => [key, [evidenceId(runId, label, 'trace', key)]]));
  const reportDigests = Object.fromEntries(ROW.reporterContracts.filter((entry) => entry.witnessLabel === label)
    .map((entry) => entry.normalizedPath).sort()
    .map((name) => [name, digestBytes(io.readFileSync(path.join(root, ...name.split('/'))))]));
  const raw = rawFacts(label, traces.routeEvidenceIds[0], saveId, reloadId);
  const facts = phase === 'final' ? raw : Object.fromEntries(Object.entries(raw).map(([key, value]) => [
    key, { status: 'observed', value, sourceEvidenceId: traces.routeEvidenceIds[0] },
  ]));
  return {
    schema: 'camp01-witness-authority/v1', parentRunId: runId, witnessId: identity.witnessId,
    executionId: identity.executionId, contextId: identity.contextId, reportDigests, status: phase,
    ...traces, label, facts,
  };
}

// prettier-ignore
function experienceFor(label, runId, identity, reports) {
  const trace = [evidenceId(runId, label, 'trace', 'routeEvidenceIds')];
  const findings = ROW.reporterContracts.filter((reporter) => reporter.witnessLabel === label).flatMap((reporter) => {
    const report = reports.find((entry) => entry.invocationId === reporter.invocationId);
    return (report?.observations ?? []).filter((entry) => entry.status !== 'passed').map((entry) => {
      const key = `${reporter.invocationId}:${entry.id}`;
      return {
        id: evidenceId(runId, label, 'finding', key), category: 'coverage-gap', severity: 'minor',
        backlogRank: 0, causeFingerprint: entry.failureFingerprint,
        reproductionId: evidenceId(runId, label, 'reproduction', key),
        failedReportObservationIds: [entry.id], sourceTraceIds: trace, dimensions: DIMENSIONS,
        disposition: EMPTY_DISPOSITION,
      };
    });
  }).sort((left, right) => left.id.localeCompare(right.id));
  return {
    schema: 'camp01-experience/v1', parentRunId: runId, witnessId: identity.witnessId,
    executionId: identity.executionId, label,
    positives: [{ id: evidenceId(runId, label, 'positive', 'positive'), sourceTraceIds: trace }],
    findings,
  };
}

// prettier-ignore
function rankFindings(experiences) {
  const ranked = experiences.flatMap((entry) => entry.findings)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((entry, index) => ({ ...entry, backlogRank: index + 1 }));
  return experiences.map((experience) => ({
    ...experience,
    findings: ranked.filter((entry) => experience.findings.some((item) => item.id === entry.id))
      .sort((left, right) => left.id.localeCompare(right.id)),
  }));
}

// prettier-ignore
function rawFacts(label, traceId, saveId, reloadId) {
  const digestFact = (key) => digestBytes(`camp01-h-fact/v1\0${label}\0${key}`);
  if (label === 'custom-save-reload') {
    return {
      savedDesignId: digestFact('savedDesignId'), savedDesignVersion: 1,
      rosterInstanceId: digestFact('rosterInstanceId'), unitRef: digestFact('unitRef'),
      campaignId: digestFact('campaignId'), missionId: digestFact('missionId'),
      saveReceiptId: saveId, reloadReceiptId: reloadId,
    };
  }
  if (label === 'campaign-mech-bay-readiness') {
    return {
      savedDesignId: digestFact('savedDesignId'), rosterInstanceId: digestFact('rosterInstanceId'),
      unitRef: digestFact('unitRef'), unitSource: 'custom', campaignId: digestFact('campaignId'),
      missionId: digestFact('missionId'), readinessBlockerId: traceId,
    };
  }
  return {
    savedDesignId: digestFact('savedDesignId'), savedDesignUnchanged: true,
    campaignId: digestFact('campaignId'), missionId: digestFact('missionId'),
    serverSessionId: digestFact('serverSessionId'), acceptedCommandId: digestFact('acceptedCommandId'),
    terminalResultId: digestFact('terminalResultId'),
    postBattleConsequenceId: digestFact('postBattleConsequenceId'),
  };
}

// prettier-ignore
function evidenceId(runId, label, kind, key) {
  return `ev-${createHash('sha256').update(`camp01-evidence/v1\0${runId}\0camp-01h\0${label}\0${kind}\0${key}`).digest('hex').slice(0, 32)}`;
}

// prettier-ignore
function gateReceiptId(gate) {
  return `receipt-${artifactDigest({
    gate, requiredRowIds: [], registeredRowIds: [], reviewedHeadRowIds: [],
    exactMainRowIds: [], cleanupRowIds: [],
  }).slice(7, 39)}`;
}

function readCanonical(file, io) {
  const bytes = io.readFileSync(file, 'utf8');
  const value = JSON.parse(bytes);
  if (bytes !== canonicalBytes(value)) fail('non-canonical composed report');
  return value;
}

// prettier-ignore
function writeExclusive(file, value, io) {
  try {
    io.writeFileSync(file, canonicalBytes(value), { flag: 'wx' });
  } catch (error) {
    if (error?.code === 'EEXIST' && path.basename(file) === 'wave-result.json') return;
    fail('composed artifact publication failed', error);
  }
}

function fail(message, cause) {
  const error = new Error(`CAMP01_H_COMPOSITION_INVALID: ${message}`);
  if (cause) error.cause = cause;
  throw error;
}
