/** Public identity domain facade. Rules remain canonical in roadmap WORKERS/DELIVERY. */
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { HEX40, readJson, sha256 } from '../roadmap-loop-runtime.mjs';
import {
  checkEngine,
  checkRef,
  exactKeys,
  identityCheck,
  nonempty,
  observedEngine,
  sessionId,
  taskId,
} from './contract.mjs';
import { identityArtifact, identityPath } from './custody.mjs';
export {
  archiveReviewIdentity,
  identityPath,
  nativeBytes,
  nativePath,
  nativeText,
} from './custody.mjs';
export { identityCheck as nativeCheck } from './contract.mjs';

export function reviewIdentityMode(value) {
  const modern =
    value &&
    ['reviewContractVersion', 'identityEvidence', 'implementationActors'].some(
      (k) => Object.hasOwn(value, k),
    );
  if (!modern) return 0;
  identityCheck(
    value.reviewContractVersion === 2,
    'partial, unknown or downgraded reviewContractVersion',
  );
  return 2;
}

export function implementationCensus(local) {
  if (!reviewIdentityMode(local)) return null;
  identityCheck(
    !Object.hasOwn(local, 'identityEvidence'),
    'local receipt cannot carry review identityEvidence',
  );
  const actors = local.implementationActors;
  identityCheck(
    Array.isArray(actors) && actors.length > 0,
    'implementationActors census missing',
  );
  for (const actor of actors)
    exactKeys(actor, {
      role: (v) => ['author', 'finisher'].includes(v),
      task_id: taskId,
      child_session_id: sessionId,
      model: nonempty,
    });
  identityCheck(
    actors.filter((a) => a.role === 'author').length === 1,
    'census must have exactly one author',
  );
  identityCheck(
    new Set(actors.map((a) => a.task_id)).size === actors.length &&
      new Set(actors.map((a) => a.child_session_id)).size === actors.length,
    'duplicate/shared implementation actor; deduplicate author/finisher',
  );
  return actors;
}

const localReviewEvidence = (ledgerDir, unit) => {
  const inline = unit.stageReceipts.local;
  const mode = reviewIdentityMode(inline);
  const file = mode
    ? identityPath(ledgerDir, inline.path)
    : inline?.path && path.resolve(ledgerDir, inline.path);
  const bytes = file && fs.existsSync(file) ? fs.readFileSync(file) : null;
  const external = bytes && JSON.parse(bytes.toString('utf8'));
  identityCheck(
    mode === reviewIdentityMode(external),
    'external modern local downgraded to legacy',
  );
  const actors = implementationCensus(external);
  identityCheck(
    !mode ||
      (external.unit === unit.id &&
        external.stage === 'local' &&
        isDeepStrictEqual(actors, implementationCensus(inline))),
    'local receipt/census disagrees with inline summary',
  );
  return { mode, actors, bytes };
};

export function validateReviewIdentity({
  ledgerDir,
  unit,
  review,
  manifestFile,
  engineRecordsDir,
  reviewBytes,
}) {
  identityCheck(
    reviewIdentityMode(review) === 2 &&
      !Object.hasOwn(review, 'implementationActors') &&
      review.unit === unit.id &&
      review.stage === 'review' &&
      review.head === review.reviewedHead &&
      HEX40.test(review.head) &&
      review.verdict === 'APPROVE',
    'modern review unit/head/verdict mismatch',
  );
  const { actors, bytes: localBytes } = localReviewEvidence(ledgerDir, unit);
  identityCheck(actors, 'modern local contributor census required');
  const manifestData = manifestFile
    ? {
        file: path.resolve(manifestFile),
        value: readJson(path.resolve(manifestFile)),
      }
    : identityArtifact(ledgerDir, review.identityEvidence);
  const manifest = manifestData.value;
  const output =
    reviewBytes ?? fs.readFileSync(identityPath(ledgerDir, review.outputPath));
  exactKeys(manifest, {
    reviewContractVersion: 2,
    unit: unit.id,
    sourceHead: review.head,
    reviewOutputSha256: (v) =>
      v === review.outputSha256 && v === sha256(output),
    localReceiptSha256: sha256(localBytes),
    author: checkRef,
    finishers: (refs) => Array.isArray(refs) && refs.every(checkRef),
    reviewer: checkRef,
  });
  const lines = output.toString('utf8').split(/\r?\n/);
  const prolog = lines.slice(0, 6);
  for (const [key, value] of Object.entries({
    Verdict: 'APPROVE',
    reviewedHead: review.head,
    reviewerModel: review.reviewerModel,
    reviewContractVersion: '2',
  })) {
    identityCheck(
      lines.filter((line) => line.startsWith(`${key}:`)).length === 1 &&
        prolog.includes(`${key}: ${value}`),
      `duplicate/conflicting/missing modern ${key} prolog`,
    );
  }
  const refs = [manifest.author, ...manifest.finishers, manifest.reviewer];
  identityCheck(
    new Set(refs.map((r) => r.path.toLowerCase())).size === refs.length,
    'aliased identity refs',
  );
  const snapshots = refs.map((ref) => {
    const artifact = identityArtifact(path.dirname(manifestData.file), ref);
    const snapshot = artifact.value;
    exactKeys(snapshot, {
      schemaVersion: 1,
      unit: manifest.unit,
      sourceHead: manifest.sourceHead,
      reviewOutputSha256: manifest.reviewOutputSha256,
      observedAt: (v) =>
        nonempty(v) &&
        /^\d{4}-\d{2}-\d{2}T/.test(v) &&
        Number.isFinite(Date.parse(v)),
      engine: checkEngine,
    });
    if (engineRecordsDir) {
      const record = readJson(
        identityPath(engineRecordsDir, `${snapshot.engine.task_id}.json`),
      );
      identityCheck(
        isDeepStrictEqual(observedEngine(record), snapshot.engine),
        'snapshot disagrees with actual engine observation',
      );
    }
    return artifact;
  });
  const engines = snapshots.map((s) => s.value.engine);
  const author = engines[0];
  const reviewer = engines.at(-1);
  const contributors = [
    actors.find((a) => a.role === 'author'),
    ...actors.filter((a) => a.role === 'finisher'),
  ];
  identityCheck(
    contributors.length === engines.length - 1 &&
      contributors.every(
        (actor, i) =>
          ['task_id', 'child_session_id', 'model'].every(
            (k) => actor[k] === engines[i][k],
          ) &&
          reviewer.task_id !== actor.task_id &&
          reviewer.child_session_id !== actor.child_session_id,
      ),
    'manifest must cover EVERY contributor with independent reviewer task/session',
  );
  identityCheck(
    review.implementerModel === author.model &&
      review.reviewerModel === reviewer.model,
    'review/implementer model disagrees with observed actor',
  );
  identityCheck(
    !Object.hasOwn(review, 'finisherModel') ||
      (manifest.finishers.length === 1 &&
        review.finisherModel === engines[1].model),
    'finisherModel misrepresents the census',
  );
  return { manifest, snapshots };
}

export function validateReviewReceipt(ledgerDir, unit) {
  const inline = unit.stageReceipts.review;
  const { mode: localMode } = localReviewEvidence(ledgerDir, unit);
  if (!inline) return;
  const mode = reviewIdentityMode(inline);
  const externalFile = mode
    ? identityPath(ledgerDir, inline.path)
    : path.resolve(ledgerDir, inline.path);
  const external = fs.existsSync(externalFile) ? readJson(externalFile) : null;
  identityCheck(
    mode === reviewIdentityMode(external) && (!localMode || mode === 2),
    'inline/external/local review contract downgrade',
  );
  if (!mode) {
    const outputFile =
      external?.outputPath && path.resolve(ledgerDir, external.outputPath);
    if (outputFile && fs.existsSync(outputFile))
      identityCheck(
        !/^reviewContractVersion:/m.test(fs.readFileSync(outputFile, 'utf8')),
        'modern review prolog downgraded to legacy',
      );
    return;
  }
  for (const key of [
    'head',
    'reviewedHead',
    'reviewerModel',
    'implementerModel',
    'finisherModel',
    'outputSha256',
    'verdict',
    'identityEvidence',
  ])
    identityCheck(
      isDeepStrictEqual(inline[key], external[key]),
      `inline/external review disagreement: ${key}`,
    );
  validateReviewIdentity({ ledgerDir, unit, review: external });
}
