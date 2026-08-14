import * as fs from 'node:fs';
import * as path from 'node:path';

import { WAVE_CONTRACTS } from './camp01-authority-receipt.contract.mjs';
import {
  ARTIFACT_SCHEMAS,
  canonicalBytes,
} from './camp01-authority-receipt.schemas.mjs';

const ROW = WAVE_CONTRACTS['camp-01g'];
const SCHEMA = 'camp01-mech-bay-authority/v1';
const ATTACHMENT_NAME = SCHEMA;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const ENVELOPE = new Set([
  'schema',
  'parentRunId',
  'executionId',
  'invocationId',
  'producerId',
  'reporterId',
  'sourceIds',
  'complete',
  'observations',
]);
const FACT_KEYS = Object.freeze(
  ARTIFACT_SCHEMAS[SCHEMA].required.filter((key) => !ENVELOPE.has(key)),
);
const PAIR_KEYS = Object.freeze([
  ['persistedResolvedRosterInstanceId', 'displayedResolvedRosterInstanceId'],
  ['persistedResolvedUnitRef', 'authorityResolvedUnitRef'],
  ['resolvedCachedNameDigest', 'resolvedDisplayedNameDigest'],
  ['resolvedCachedTonnage', 'resolvedDisplayedTonnage'],
  [
    'persistedUnresolvedRosterInstanceId',
    'displayedUnresolvedRosterInstanceId',
  ],
  ['persistedUnresolvedUnitRef', 'displayedUnresolvedUnitRef'],
  ['unresolvedCachedNameDigest', 'unresolvedDisplayedNameDigest'],
  ['unresolvedCachedTonnage', 'unresolvedDisplayedTonnage'],
]);
const TRUE_KEYS = Object.freeze([
  'bvAvailabilityHonest',
  'unresolvedSourceVisible',
  'stockSubstitutionAbsent',
]);

export class Camp01GReportNormalizerError extends Error {
  constructor(message, options) {
    super(`CAMP01_G_REPORT_INVALID: ${message}`, options);
    this.name = 'Camp01GReportNormalizerError';
  }
}

export function prepareCamp01GReport(options) {
  const { environment, isolation, producerId, dependencies = {} } = options;
  if (!isolation?.active) return inactive();
  const reporter = ROW.reporterContracts.find(
    (entry) =>
      entry.invocationId === environment.CAMP01_INVOCATION_ID &&
      entry.producerId === producerId,
  );
  if (!reporter) return inactive();
  const io = dependencies.fs ?? fs;
  const realpath = dependencies.realpath ?? fs.realpathSync.native;
  return Object.freeze({
    active: true,
    reporter,
    normalize: (observed) =>
      publishReport({
        environment,
        io,
        observed,
        realpath,
        reporter,
      }),
  });
}

function publishReport(context) {
  const { environment, io, observed, realpath, reporter } = context;
  const observations = normalizeObservations(reporter, observed);
  const requiredId = reporter.requiredTestIds[0];
  const entry = observed.get(requiredId);
  const facts = readFacts(entry);
  const complete = isCompleteObservationSet(reporter, observations, entry);
  if (reporter.completeObservationSet && !complete)
    fail('authority observation set incomplete');
  const artifactRoot = resolvePath(
    environment.CAMP01_ARTIFACT_DIR,
    realpath,
    'normalized artifact directory resolution failed',
  );
  const target = path.resolve(
    artifactRoot,
    ...reporter.normalizedPath.split('/'),
  );
  const reportDirectory = path.dirname(target);
  if (
    reportDirectory !== path.join(artifactRoot, 'reports') ||
    !target.startsWith(`${artifactRoot}${path.sep}`)
  )
    fail('normalized report path escaped writer directory');
  const existing = lstatIfPresent(reportDirectory, io);
  if (existing === null) {
    try {
      io.mkdirSync(reportDirectory);
    } catch (error) {
      fail('normalized report directory creation failed', error);
    }
  } else if (existing.isSymbolicLink() || !existing.isDirectory())
    fail('normalized report directory invalid');
  if (
    resolvePath(
      reportDirectory,
      realpath,
      'normalized report directory resolution failed',
    ) !== reportDirectory
  )
    fail('normalized report directory escaped writer directory');
  const value = {
    schema: reporter.reportSchema,
    parentRunId: environment.CAMP01_RUN_ID,
    executionId: environment.CAMP01_EXECUTION_ID,
    invocationId: reporter.invocationId,
    producerId: reporter.producerId,
    reporterId: reporter.reporterId,
    sourceIds: reporter.sourceIds,
    complete,
    observations,
    ...facts,
  };
  try {
    io.writeFileSync(target, canonicalBytes(value), { flag: 'wx' });
  } catch (error) {
    fail('normalized report publication failed', error);
  }
  return value;
}

function normalizeObservations(reporter, observed) {
  if (!(observed instanceof Map)) fail('observed report input drift');
  if (
    !Array.isArray(reporter.requiredTestIds) ||
    !reporter.requiredTestIds.length
  )
    fail('authority observation missing');
  return Object.freeze(
    reporter.requiredTestIds.map((id) => {
      const entry = observed.get(id);
      if (!entry) fail('authority observation missing');
      if (
        entry.id !== id ||
        entry.status !== 'passed' ||
        !reporter.allowedStatuses.includes(entry.status)
      )
        fail('authority observation drift');
      return Object.freeze({ id, status: 'passed', failureFingerprint: null });
    }),
  );
}

function isCompleteObservationSet(reporter, observations, entry) {
  return (
    reporter.completeObservationSet === true &&
    observations.length === reporter.requiredTestIds.length &&
    reporter.requiredTestIds.every(
      (id, index) =>
        observations[index]?.id === id &&
        observations[index]?.status === 'passed',
    ) &&
    Boolean(entry) &&
    Array.isArray(entry.attachments) &&
    entry.attachments.length === 1 &&
    entry.attachments[0]?.name === ATTACHMENT_NAME &&
    !entry.attachments[0].path
  );
}

function readFacts(entry) {
  if (!Array.isArray(entry?.attachments)) fail('mech-bay attachment missing');
  const matches = entry.attachments.filter(
    (attachment) => attachment?.name === ATTACHMENT_NAME,
  );
  if (matches.length !== 1)
    fail(
      matches.length
        ? 'duplicate mech-bay attachment'
        : 'mech-bay attachment missing',
    );
  if (entry.attachments.length !== 1) fail('mech-bay attachment drift');
  const attachment = matches[0];
  if (attachment.path) fail('caller attachment drop');
  if (
    attachment.contentType !== 'application/json' ||
    typeof attachment.body !== 'string' ||
    !attachment.body
  )
    fail('mech-bay attachment malformed');
  let facts;
  try {
    facts = JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf8'));
  } catch (error) {
    fail('mech-bay attachment malformed', error);
  }
  if (
    !facts ||
    typeof facts !== 'object' ||
    Array.isArray(facts) ||
    JSON.stringify(Object.keys(facts)) !== JSON.stringify(FACT_KEYS)
  )
    fail('mech-bay facts drift');
  PAIR_KEYS.forEach(([left, right]) => {
    if (facts[left] !== facts[right]) fail('Mech Bay identity drift');
  });
  if (
    PAIR_KEYS.filter(([left]) => !left.includes('Tonnage')).some(
      ([left]) => !DIGEST.test(facts[left]),
    ) ||
    facts.coldReloaded !== true ||
    facts.resolvedUnitSource !== 'custom' ||
    facts.unresolvedUnitSource !== 'custom' ||
    !['available', 'unavailable'].includes(facts.bvStatus) ||
    !Number.isFinite(facts.resolvedCachedTonnage) ||
    facts.resolvedCachedTonnage <= 0 ||
    !Number.isFinite(facts.unresolvedCachedTonnage) ||
    facts.unresolvedCachedTonnage <= 0 ||
    TRUE_KEYS.some((key) => facts[key] !== true)
  )
    fail('Mech Bay authority drift');
  return facts;
}

function lstatIfPresent(value, io) {
  try {
    return io.lstatSync(value);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    fail('normalized report directory inspection failed', error);
  }
}

function resolvePath(value, realpath, message) {
  try {
    return realpath(value);
  } catch (error) {
    fail(message, error);
  }
}

function inactive() {
  return Object.freeze({
    active: false,
    reporter: null,
    normalize: async () => undefined,
  });
}

function fail(message, cause) {
  throw new Camp01GReportNormalizerError(message, { cause });
}
