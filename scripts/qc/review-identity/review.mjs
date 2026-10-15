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
  nativeRef,
  nativeText,
  nativeJson,
} from './contract.mjs';
import {
  identityArtifact,
  identityPath,
  nativeArtifact,
  nativeArtifacts,
  nativeBuffers,
  nativeBytes,
  nativeReadFiles,
} from './custody.mjs';
import {
  nativeImplementationCensus,
  validateNativeReview,
} from './native-binding.mjs';
export {
  archiveReviewIdentity,
  identityPath,
  nativeBytes,
  nativeFile,
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
    value.reviewContractVersion === 2 || value.reviewContractVersion === 3,
    'partial, unknown or downgraded reviewContractVersion',
  );
  return value.reviewContractVersion;
}

export function implementationCensus(local) {
  const mode = reviewIdentityMode(local);
  if (!mode) return null;
  identityCheck(
    !Object.hasOwn(local, 'identityEvidence'),
    'local receipt cannot carry review identityEvidence',
  );
  const actors = local.implementationActors;
  if (mode === 3) {
    nativeImplementationCensus(actors);
    return actors;
  }
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

const localReviewEvidence = (ledgerDir, unit, nativeInput) => {
  const inline = unit.stageReceipts.local;
  const mode = reviewIdentityMode(inline);
  const native =
    mode === 3
      ? (nativeInput ?? nativeReadFiles(ledgerDir, [inline.path])[0])
      : null;
  const file =
    mode === 3
      ? native.file
      : mode
        ? identityPath(ledgerDir, inline.path)
        : inline?.path && path.resolve(ledgerDir, inline.path);
  const bytes =
    file && fs.existsSync(file)
      ? mode === 3
        ? native.bytes
        : fs.readFileSync(file)
      : null;
  const external =
    bytes &&
    (mode === 3 ? nativeJson(bytes) : JSON.parse(bytes.toString('utf8')));
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
  return { mode, actors, bytes, file };
};

function reviewProlog(output, review, version) {
  const lines = (
    version === 3 ? nativeText(output) : output.toString('utf8')
  ).split(/\r?\n/);
  const prolog = lines.slice(0, 6);
  for (const [key, value] of Object.entries({
    Verdict: 'APPROVE',
    reviewedHead: review.head,
    reviewerModel: review.reviewerModel,
    reviewContractVersion: String(version),
  })) {
    identityCheck(
      lines.filter((line) => line.startsWith(`${key}:`)).length === 1 &&
        prolog.includes(`${key}: ${value}`),
      `duplicate/conflicting/missing modern ${key} prolog`,
    );
  }
}

function validateNativeIdentity({
  ledgerDir,
  unit,
  review,
  manifestFile,
  nativeObservationsDir,
  engineRecordsDir,
  reviewBytes,
  reviewFile,
}) {
  identityCheck(
    !engineRecordsDir &&
      !Object.hasOwn(review, 'implementationActors') &&
      review.unit === unit.id &&
      review.stage === 'review' &&
      review.head === review.reviewedHead &&
      HEX40.test(review.head) &&
      review.verdict === 'APPROVE',
    'native review unit/head/verdict or engine adapter mismatch',
  );
  // Archived selectors are known together; this is a new read after receipt intake.
  const archived =
    !manifestFile &&
    !reviewFile &&
    reviewIdentityMode(unit.stageReceipts.local) === 3
      ? nativeReadFiles(
          ledgerDir,
          [
            unit.stageReceipts.local.path,
            review.identityEvidence?.path,
            review.outputPath,
          ],
          [review.identityEvidence],
        )
      : null;
  const local = localReviewEvidence(ledgerDir, unit, archived?.[0]);
  identityCheck(
    local.mode === 3 && local.actors,
    'paired native local census required',
  );
  identityCheck(
    !manifestFile || nativeObservationsDir,
    'native candidate requires explicit native observations directory',
  );
  const data = manifestFile
    ? {
        file: path.resolve(manifestFile),
        bytes: nativeBytes(path.resolve(manifestFile)),
      }
    : (archived?.[1] ?? nativeArtifact(ledgerDir, review.identityEvidence));
  const manifest = data.value ?? nativeJson(data.bytes);
  const retainedOutput = reviewFile
    ? {
        file: path.resolve(reviewFile),
        bytes: nativeBytes(path.resolve(reviewFile)),
      }
    : (archived?.[2] ?? nativeReadFiles(ledgerDir, [review.outputPath])[0]);
  const { bytes: output } = retainedOutput;
  identityCheck(
    !reviewBytes || output.equals(reviewBytes),
    'native retained review bytes drift',
  );
  exactKeys(manifest, {
    reviewContractVersion: 3,
    unit: unit.id,
    sourceHead: review.head,
    reviewOutputSha256: (v) =>
      v === review.outputSha256 && v === sha256(output),
    localReceiptSha256: sha256(local.bytes),
    author: nativeRef,
    finishers: (refs) => Array.isArray(refs) && refs.every(nativeRef),
    reviewer: nativeRef,
  });
  reviewProlog(output, review, 3);
  const refs = [manifest.author, ...manifest.finishers, manifest.reviewer];
  identityCheck(
    new Set(refs.map((r) => r.path.toLowerCase())).size === refs.length &&
      refs.every(
        (r) => path.basename(r.path) === `codex-observation-${r.sha256}.json`,
      ),
    'native observation refs aliased/wrong kind',
  );
  if (!manifestFile)
    identityCheck(
      path.basename(review.identityEvidence.path) ===
        `codex-review-identity-${review.identityEvidence.sha256}.json`,
      'native archived manifest kind mismatch',
    );
  const snapshots = nativeArtifacts(path.dirname(data.file), refs);
  if (nativeObservationsDir) {
    const actual = nativeArtifacts(nativeObservationsDir, refs);
    snapshots.forEach((artifact, index) =>
      identityCheck(
        actual[index].bytes.equals(artifact.bytes),
        'native snapshot differs from actual qualified capture',
      ),
    );
  }
  const bindings = validateNativeReview({
    snapshots,
    manifest,
    actors: local.actors,
    review,
    localSha256: sha256(local.bytes),
  });
  const revalidate = () => {
    const frozen = [data, retainedOutput, local, ...snapshots];
    const current = nativeBuffers(frozen.map((artifact) => artifact.file));
    identityCheck(
      current.slice(0, 3).every((bytes, i) => bytes.equals(frozen[i].bytes)),
      'native frozen manifest/review/local artifact drift',
    );
    snapshots.forEach((snapshot, i) =>
      identityCheck(
        current[i + 3].equals(snapshot.bytes),
        'native frozen observation artifact drift',
      ),
    );
    if (nativeObservationsDir) {
      const actual = nativeArtifacts(nativeObservationsDir, refs);
      snapshots.forEach((snapshot, i) =>
        identityCheck(
          actual[i].bytes.equals(snapshot.bytes),
          'native actual capture artifact drift',
        ),
      );
    }
  };
  revalidate();
  return { manifest, snapshots, bindings, revalidate };
}

export function validateReviewIdentity({
  ledgerDir,
  unit,
  review,
  manifestFile,
  engineRecordsDir,
  reviewBytes,
  reviewFile,
  nativeObservationsDir,
}) {
  if (reviewIdentityMode(review) === 3)
    return validateNativeIdentity({
      ledgerDir,
      unit,
      review,
      manifestFile,
      engineRecordsDir,
      nativeObservationsDir,
      reviewBytes,
      reviewFile,
    });
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
  reviewProlog(output, review, 2);
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
  const mode = reviewIdentityMode(inline);
  const intake =
    mode === 3 && reviewIdentityMode(unit.stageReceipts.local) === 3
      ? nativeReadFiles(ledgerDir, [unit.stageReceipts.local.path, inline.path])
      : null;
  const { mode: localMode } = localReviewEvidence(ledgerDir, unit, intake?.[0]);
  if (!inline) return;
  const native =
    mode === 3
      ? (intake?.[1] ?? nativeReadFiles(ledgerDir, [inline.path])[0])
      : null;
  const externalFile =
    mode === 3
      ? native.file
      : mode
        ? identityPath(ledgerDir, inline.path)
        : path.resolve(ledgerDir, inline.path);
  const external = fs.existsSync(externalFile)
    ? mode === 3
      ? nativeJson(native.bytes)
      : readJson(externalFile)
    : null;
  identityCheck(
    mode === reviewIdentityMode(external) && (!localMode || mode === localMode),
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
