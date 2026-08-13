import * as fs from 'node:fs';
import * as path from 'node:path';

import { WAVE_CONTRACTS } from './camp01-authority-receipt.contract.mjs';
import {
  ARTIFACT_SCHEMAS,
  canonicalBytes,
} from './camp01-authority-receipt.schemas.mjs';

const ROW = WAVE_CONTRACTS['camp-01f'];
const SCHEMA = 'camp01-campaign-persistence-authority/v1';
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
  ['acceptedCampaignId', 'persistedCampaignId'],
  ['acceptedRosterInstanceId', 'persistedRosterInstanceId'],
  ['acceptedUnitRef', 'persistedUnitRef'],
]);
const TRUE_KEYS = Object.freeze([
  'acceptedRootForceContainsInstance',
  'persistedRootForceContainsInstance',
  'acceptedConstructionPayloadAbsent',
  'persistedConstructionPayloadAbsent',
  'successSuppressedOnFailure',
  'retryCampaignIdMatched',
  'conflictRetryCampaignIdMatched',
  'conflictOverwritePrevented',
]);

export class Camp01FReportNormalizerError extends Error {
  constructor(message, options) {
    super(`CAMP01_F_REPORT_INVALID: ${message}`, options);
    this.name = 'Camp01FReportNormalizerError';
  }
}

export function prepareCamp01FReport(options) {
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
  const facts = readFacts(observed.get(reporter.requiredTestIds[0]));
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
    complete: true,
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
  const id = reporter.requiredTestIds[0];
  const entry = observed.get(id);
  if (!entry) fail('authority observation missing');
  if (
    entry.id !== id ||
    entry.status !== 'passed' ||
    !reporter.allowedStatuses.includes(entry.status)
  )
    fail('authority observation drift');
  return Object.freeze([
    Object.freeze({ id, status: 'passed', failureFingerprint: null }),
  ]);
}

function readFacts(entry) {
  if (!Array.isArray(entry?.attachments))
    fail('persistence attachment missing');
  const matches = entry.attachments.filter(
    (attachment) => attachment?.name === ATTACHMENT_NAME,
  );
  if (matches.length !== 1)
    fail(
      matches.length
        ? 'duplicate persistence attachment'
        : 'persistence attachment missing',
    );
  if (entry.attachments.length !== 1) fail('persistence attachment drift');
  const attachment = matches[0];
  if (attachment.path) fail('caller attachment drop');
  if (
    attachment.contentType !== 'application/json' ||
    typeof attachment.body !== 'string' ||
    !attachment.body
  )
    fail('persistence attachment malformed');
  let facts;
  try {
    facts = JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf8'));
  } catch (error) {
    fail('persistence attachment malformed', error);
  }
  if (
    !facts ||
    typeof facts !== 'object' ||
    Array.isArray(facts) ||
    JSON.stringify(Object.keys(facts)) !== JSON.stringify(FACT_KEYS)
  )
    fail('persistence facts drift');
  PAIR_KEYS.forEach(([accepted, persisted]) => {
    if (facts[accepted] !== facts[persisted] || !DIGEST.test(facts[accepted]))
      fail('persistence identity drift');
  });
  if (
    facts.requestMethod !== 'PUT' ||
    facts.acceptedResult !== 'saved' ||
    facts.acceptedUnitSource !== 'custom' ||
    facts.persistedUnitSource !== 'custom' ||
    TRUE_KEYS.some((key) => facts[key] !== true)
  )
    fail('persistence authority drift');
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
  throw new Camp01FReportNormalizerError(message, { cause });
}
