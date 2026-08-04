import * as fs from 'node:fs';
import * as path from 'node:path';

import { WAVE_CONTRACTS } from './camp01-authority-receipt.contract.mjs';
import {
  H_TEST_IDS,
  canonicalBytes,
  digestBytes,
} from './camp01-authority-receipt.schemas.mjs';

const ROW = WAVE_CONTRACTS['camp-01h'];
const LABELS = [
  'custom-save-reload',
  'campaign-mech-bay-readiness',
  'canonical-combat-post-battle',
];
const IDENTITY_ROLES = ['witnessId', 'executionId', 'contextId'];
const EVIDENCE_ID = /^ev-[0-9a-f]{32}$/;

export class Camp01HReportNormalizerError extends Error {
  constructor(message, options) {
    super(`CAMP01_H_REPORT_INVALID: ${message}`, options);
    this.name = 'Camp01HReportNormalizerError';
  }
}

export function selectOrdinaryExitNormalizer(exitCode, signal, normalize) {
  return signal === null && (exitCode === 0 || exitCode === 1)
    ? normalize
    : undefined;
}

export function prepareCamp01HReport(options) {
  const { environment, isolation, producerId, dependencies = {} } = options;
  if (!isolation?.active) return inactive();
  const reporter = ROW.reporterContracts.find(
    (entry) =>
      entry.invocationId === environment.CAMP01_INVOCATION_ID &&
      entry.producerId === producerId,
  );
  if (!reporter) return inactive();
  const identity = readIdentity(environment, reporter);
  const io = dependencies.fs ?? fs;
  const realpath = dependencies.realpath ?? fs.realpathSync.native;
  return Object.freeze({
    active: true,
    reporter,
    normalize: (observed) =>
      publishReport({
        environment,
        identity,
        io,
        observed,
        realpath,
        reporter,
      }),
  });
}

function publishReport(context) {
  const { environment, identity, io, observed, realpath, reporter } = context;
  const observations = normalizeObservations(reporter, observed);
  const artifactRoot = realpath(environment.CAMP01_ARTIFACT_DIR);
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
  if (existing === null) io.mkdirSync(reportDirectory);
  else if (existing.isSymbolicLink() || !existing.isDirectory())
    fail('normalized report directory invalid');
  if (realpath(reportDirectory) !== reportDirectory)
    fail('normalized report directory escaped writer directory');
  const value = {
    schema: reporter.reportSchema,
    parentRunId: environment.CAMP01_RUN_ID,
    witnessId: identity.witnessId,
    executionId: identity.executionId,
    witnessLabel: reporter.witnessLabel,
    invocationId: reporter.invocationId,
    producerId: reporter.producerId,
    reporterId: reporter.reporterId,
    sourceIds: reporter.sourceIds,
    complete: true,
    observations,
  };
  try {
    io.writeFileSync(target, canonicalBytes(value), { flag: 'wx' });
  } catch (error) {
    fail('normalized report publication failed', error);
  }
  return value;
}

function normalizeObservations(reporter, observed) {
  const inventory = H_TEST_IDS[reporter.invocationId];
  if (!inventory || !Array.isArray(observed))
    fail('report inventory unavailable');
  const statuses = new Map();
  for (const entry of observed) {
    if (
      !entry ||
      JSON.stringify(Object.keys(entry)) !== JSON.stringify(['id', 'status']) ||
      !inventory.includes(entry.id) ||
      !reporter.allowedStatuses.includes(entry.status) ||
      statuses.has(entry.id)
    )
      fail('observed report input drift');
    statuses.set(entry.id, entry.status);
  }
  return inventory.map((id) => {
    const status = statuses.get(id) ?? 'missing';
    return {
      id,
      status,
      failureFingerprint:
        status === 'passed'
          ? null
          : digestBytes(
              JSON.stringify({
                invocationId: reporter.invocationId,
                id,
                status,
              }),
            ),
    };
  });
}

function readIdentity(environment, reporter) {
  let identities;
  try {
    identities = JSON.parse(environment.CAMP01_H_IDENTITIES);
  } catch (error) {
    fail('writer identity map unavailable', error);
  }
  if (
    JSON.stringify(Object.keys(identities ?? {})) !== JSON.stringify(LABELS) ||
    Object.values(identities).some(
      (entry) =>
        JSON.stringify(Object.keys(entry ?? {})) !==
          JSON.stringify(IDENTITY_ROLES) ||
        Object.values(entry).some((id) => !EVIDENCE_ID.test(id)),
    )
  )
    fail('writer identity map drift');
  const identity = identities[reporter.witnessLabel];
  if (identity.executionId !== environment.CAMP01_EXECUTION_ID)
    fail('writer execution identity drift');
  return identity;
}

function lstatIfPresent(value, io) {
  try {
    return io.lstatSync(value);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    fail('normalized report directory inspection failed', error);
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
  throw new Camp01HReportNormalizerError(message, { cause });
}
