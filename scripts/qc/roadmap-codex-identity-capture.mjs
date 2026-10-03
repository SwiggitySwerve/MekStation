/** Explicit LOCAL native capture. This producer does not grant observer authority. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import {
  NATIVE_PRIVATE_ROOTS,
  blobRef,
  checkReadbacks,
  identityCheck,
  nativeText,
  privateQaPath,
  relativePath,
} from './review-identity/contract.mjs';
import {
  nativeBuffers,
  nativeBytes,
  nativePath,
  publishNativeCapture,
} from './review-identity/custody.mjs';
import {
  nativeAppObservation,
  validateNativeObservation,
} from './review-identity/native-binding.mjs';
import {
  decodeReadback,
  encodeReadbackChunk,
  nativeActor,
  nativeParentLink,
  nativeSpawn,
  reopenNativeRecords,
  sourceObservation,
} from './review-identity/source.mjs';
import {
  HEX40,
  LoopScriptError,
  parseFlags,
  requireFlags,
  refuse,
  sha256,
} from './roadmap-loop-runtime.mjs';

const safeBoundary = (action) => {
  try {
    return action();
  } catch (error) {
    if (
      error instanceof LoopScriptError &&
      error.code === 'REVIEW_IDENTITY_INVALID'
    )
      throw error;
    refuse(
      'NATIVE_CAPTURE_REFUSED',
      'native capture inputs, source or byte bindings refused',
    );
  }
};
const gitBytes = (root, args) => {
  const result = spawnSync('git', ['--no-optional-locks', ...args], {
    cwd: root,
    encoding: null,
    maxBuffer: 1024 * 1024 * 1024,
    windowsHide: true,
  });
  identityCheck(
    result.status === 0 && result.stderr.length === 0,
    'native source Git observation refused',
  );
  return result.stdout;
};
const sourceInventory = (root, unit) => {
  const list = (args) =>
    nativeText(gitBytes(root, args)).split('\0').filter(Boolean);
  const registration = JSON.parse(
    nativeText(
      gitBytes(root, [
        'show',
        'HEAD:openspec/planning/2026-09-12-roadmap-completion/evidence/cni-registration-20261002.json',
      ]),
    ),
  );
  const ledger = JSON.parse(
    nativeText(
      gitBytes(root, [
        'show',
        'HEAD:openspec/planning/2026-09-12-roadmap-completion/units.json',
      ]),
    ),
  );
  const units = ledger.units?.filter((entry) => entry.id === unit);
  const grants = registration.grants?.filter((g) => g.id === unit);
  identityCheck(
    grants?.length === 1 &&
      units?.length === 1 &&
      typeof grants[0].node === 'string' &&
      grants[0].node.length > 0 &&
      grants[0].node.trim() === grants[0].node &&
      grants[0].node === units[0].node &&
      Array.isArray(grants[0].exactFiles),
    'native committed source grant absent/ambiguous',
  );
  identityCheck(
    !Object.hasOwn(grants[0], 'frozenEvidenceFiles') ||
      Array.isArray(grants[0].frozenEvidenceFiles),
    'native frozen evidence inventory malformed',
  );
  const files = [
    ...grants[0].exactFiles,
    ...(grants[0].frozenEvidenceFiles ?? []),
  ];
  const ignored = list([
    'ls-files',
    '--others',
    '--ignored',
    '--exclude-standard',
    '-z',
  ]);
  identityCheck(
    ignored.every(privateQaPath),
    'unbound ignored source/material refused',
  );
  identityCheck(
    !list(['ls-files', '-z']).some(privateQaPath),
    'tracked source cannot be classified as private QA',
  );
  const affecting = [
    ...list(['diff', '--name-only', '-z', 'HEAD', '--']),
    ...list(['ls-files', '--others', '--exclude-standard', '-z']),
  ];
  identityCheck(
    affecting.every((p) => privateQaPath(p) || files.includes(p)),
    'changed/untracked source outside registered capture grant',
  );
  identityCheck(
    files.length > 0 &&
      files.every(relativePath) &&
      new Set(files.map((p) => p.toLowerCase())).size === files.length,
    'native source inventory aliases',
  );
  const frozen = grants[0].frozenEvidenceFiles ?? [];
  if (frozen.length) {
    const committed = list(['ls-tree', '-z', 'HEAD', '--', ...frozen]);
    identityCheck(
      committed.length === frozen.length &&
        frozen.every((file) =>
          committed.some((entry) => {
            const [header, name] = entry.split('\t');
            const [mode, type, object] = header.split(' ');
            return (
              ['100644', '100755'].includes(mode) &&
              type === 'blob' &&
              HEX40.test(object) &&
              name === file
            );
          }),
        ),
      'native frozen evidence must be committed regular blobs',
    );
    const current = nativeBuffers(frozen.map((file) => path.join(root, file)));
    identityCheck(
      frozen.every((file, i) =>
        current[i].equals(gitBytes(root, ['show', `HEAD:${file}`])),
      ),
      'native frozen evidence bytes changed',
    );
  }
  return files.sort();
};
const sourceStatus = (root) =>
  gitBytes(root, [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
    '--ignored=matching',
    '-z',
    '--',
    '.',
    ...NATIVE_PRIVATE_ROOTS.map((p) => `:(exclude)${p}`),
  ]);

/** Full native readback protocol: file hashes follow actual complete binary reads. */
export function sourceReadback({
  repoRoot,
  unit = 'CNI1',
  reviewOutput,
  localReceipt,
}) {
  return safeBoundary(() => {
    const root = nativePath(repoRoot, true).absolute;
    const files = sourceInventory(root, unit);
    const head = nativeText(gitBytes(root, ['rev-parse', 'HEAD'])).trim();
    const tree = nativeText(
      gitBytes(root, ['rev-parse', 'HEAD^{tree}']),
    ).trim();
    const indexFile = path.resolve(
      root,
      nativeText(gitBytes(root, ['rev-parse', '--git-path', 'index'])).trim(),
    );
    const index = nativeBytes(indexFile);
    const inventory = gitBytes(root, ['ls-files', '--stage', '-z']);
    const diff = gitBytes(root, ['diff', '--binary', 'HEAD', '--']);
    const status = sourceStatus(root);
    const buffers = nativeBuffers(files.map((file) => path.join(root, file)));
    const result = {
      readbackVersion: 1,
      privateRoots: NATIVE_PRIVATE_ROOTS,
      head,
      tree,
      index: index.toString('base64'),
      inventory: inventory.toString('base64'),
      diff: diff.toString('base64'),
      status: status.toString('base64'),
      files: files.map((file, i) => ({
        path: file,
        base64: buffers[i].toString('base64'),
      })),
    };
    for (const [name, file] of Object.entries({
      review: reviewOutput,
      local: localReceipt,
    }))
      if (file !== undefined)
        result[name] = nativeBytes(file).toString('base64');
    identityCheck(
      isDeepStrictEqual(sourceInventory(root, unit), files) &&
        nativeText(gitBytes(root, ['rev-parse', 'HEAD'])).trim() === head &&
        nativeBytes(indexFile).equals(index) &&
        gitBytes(root, ['ls-files', '--stage', '-z']).equals(inventory) &&
        gitBytes(root, ['diff', '--binary', 'HEAD', '--']).equals(diff) &&
        sourceStatus(root).equals(status),
      'native source inventory/Git changed',
    );
    checkReadbacks(
      decodeReadback(
        Buffer.from(JSON.stringify(result)),
        Object.keys(result).filter((k) => ['review', 'local'].includes(k)),
      ).readbacks,
      Object.keys(result).filter((k) => ['review', 'local'].includes(k)),
    );
    return result;
  });
}

const frozenScan = (file, source) => {
  const bytes = nativeBytes(file, fs.statSync(file).size);
  return reopenNativeRecords(bytes, source);
};
export const sourceReadbackChunk = (options, index) =>
  encodeReadbackChunk(sourceReadback(options), index);
const same = (actual, expected, message) =>
  identityCheck(isDeepStrictEqual(actual, expected), message);
const sameReadback = (actual, expected) => {
  // Contributors observed source only; the reviewer also observed its output.
  same(
    actual.readbacks,
    Object.fromEntries(
      Object.keys(actual.readbacks).map((key) => [
        key,
        expected.readbacks[key],
      ]),
    ),
    'native complete readback bindings differ',
  );
  identityCheck(
    actual.fileBytes.length === expected.fileBytes.length &&
      actual.fileBytes.every(
        (file, i) =>
          file.path === expected.fileBytes[i].path &&
          file.bytes.equals(expected.fileBytes[i].bytes),
      ),
    'native full source readback bytes differ',
  );
  for (const [name, bytes] of Object.entries(actual.artifacts))
    identityCheck(
      expected.artifacts[name]?.equals(bytes),
      'native full artifact readback bytes differ',
    );
};

export function captureNativeIdentity(options) {
  return safeBoundary(() => {
    const appBytes = nativeBytes(options.appObservation);
    const routeBytes = nativeBytes(options.routeWitness);
    const app = JSON.parse(nativeText(appBytes));
    const route = JSON.parse(nativeText(routeBytes));
    const snapshot = {
      schemaVersion: 1,
      reviewContractVersion: 3,
      unit: options.unit,
      sourceHead: options.sourceHead,
      reviewOutputSha256: sha256(nativeBytes(options.reviewOutput)),
      observedAt: new Date().toISOString(),
      appWitness: { utf8: nativeText(appBytes), ...blobRef(appBytes) },
      routeWitness: { utf8: nativeText(routeBytes), ...blobRef(routeBytes) },
    };
    const checked = validateNativeObservation(snapshot);
    const ownedRoot = nativePath(options.repoRoot, true).absolute;
    identityCheck(
      nativePath(checked.observation.completion.workdir, true).absolute ===
        ownedRoot,
      'native call is outside the exact owned checkout',
    );
    identityCheck(
      options.sessionId === checked.observation.native.sessionId &&
        options.turnId === checked.observation.completion.turnId,
      'native explicit session/turn selectors disagree',
    );
    const subjectScan = frozenScan(
      options.sessionFile,
      checked.observation.source,
    );
    const subject = sourceObservation(subjectScan, {
      turnIds: checked.observation.native.turns.map((t) => t.turnId),
      callId: checked.observation.completion.id,
      chunkCallIds: checked.observation.chunks?.map((c) => c.id),
    });
    const artifacts = checked.observation.role === 'reviewer' ? ['review'] : [];
    const subjectReadback = decodeReadback(subject.stdout, artifacts);
    const subjectProjection = {
      role: checked.observation.role,
      native: subject.native,
      source: subject.source,
      terminals: subject.terminals,
      completion: subject.completion,
      ...(subject.chunks ? { chunks: subject.chunks } : {}),
      readbacks: subjectReadback.readbacks,
    };
    if (subject.native.parentSessionId) {
      identityCheck(
        options.parentSessionFile,
        'child requires explicit parent source',
      );
      subjectProjection.spawn = nativeSpawn(
        frozenScan(options.parentSessionFile, checked.observation.spawn.source),
        subject.native,
        checked.observation.spawn.callId,
      );
    } else
      identityCheck(
        options.parentSessionFile === undefined,
        'root actor cannot carry parent selector',
      );
    if (checked.observation.parentLink)
      subjectProjection.parentLink = nativeParentLink(
        frozenScan(
          options.parentSessionFile,
          checked.observation.parentLink.source,
        ),
        subject.native,
        checked.observation.parentLink.callId,
      );
    same(
      subjectProjection,
      route.observation,
      'native raw subject disagrees with witnessed source',
    );
    const observerScan = frozenScan(
      options.observerSessionFile,
      checked.observer.source,
    );
    const observerActor = nativeActor(
      observerScan,
      checked.observer.native.turns.map((t) => t.turnId),
    );
    const appProjection = nativeAppObservation(
      observerScan,
      observerActor.native,
      {
        subject: subject.native,
        callId: subject.completion.id,
        chunkCallIds: subject.chunks?.map((c) => c.id),
        appCallIds: app.observer.callIds.filter((id) => {
          const r = observerScan.records.find(
            (r) =>
              r.value.payload.item?.id === id &&
              r.value.payload.type === 'item_completed',
          );
          return (
            r?.value.payload.item.arguments?.threadId ===
            subject.native.sessionId
          );
        }),
        parentAppCallIds: app.observer.callIds.filter((id) => {
          const r = observerScan.records.find(
            (r) =>
              r.value.payload.item?.id === id &&
              r.value.payload.type === 'item_completed',
          );
          return (
            r?.value.payload.item.arguments?.threadId ===
            subject.native.parentSessionId
          );
        }),
        ...(subjectProjection.spawn
          ? { spawnCallId: subjectProjection.spawn.callId }
          : {}),
        ...(subjectProjection.parentLink
          ? { parentLinkCallId: subjectProjection.parentLink.callId }
          : {}),
      },
    );
    same(appProjection.app, app, 'native raw live API observation differs');
    const observer = sourceObservation(observerScan, {
      turnIds: observerActor.native.turns.map((t) => t.turnId),
      callId: checked.observer.completion.id,
      chunkCallIds: checked.observer.chunks?.map((c) => c.id),
      extraRecords: appProjection.selected,
    });
    const finalReadback = decodeReadback(observer.stdout, ['review', 'local']);
    sameReadback(subjectReadback, finalReadback);
    same(
      {
        native: observer.native,
        source: observer.source,
        completion: observer.completion,
        ...(observer.chunks ? { chunks: observer.chunks } : {}),
        readbacks: finalReadback.readbacks,
        census: checked.observer.census,
      },
      route.observer,
      'native independent observer raw bindings differ',
    );
    const current = sourceReadback({
      repoRoot: options.repoRoot,
      unit: options.unit,
      reviewOutput: options.reviewOutput,
      localReceipt: options.localReceipt,
    });
    sameReadback(
      decodeReadback(Buffer.from(JSON.stringify(current)), ['review', 'local']),
      finalReadback,
    );
    identityCheck(
      finalReadback.artifacts.review.equals(
        nativeBytes(options.reviewOutput),
      ) &&
        finalReadback.artifacts.local.equals(nativeBytes(options.localReceipt)),
      'native final complete artifacts disagree',
    );
    const revalidate = () => {
      identityCheck(
        nativeBytes(options.appObservation).equals(appBytes) &&
          nativeBytes(options.routeWitness).equals(routeBytes),
        'native witness artifact drift',
      );
      frozenScan(options.sessionFile, checked.observation.source);
      frozenScan(options.observerSessionFile, checked.observer.source);
      if (subjectProjection.spawn)
        frozenScan(options.parentSessionFile, subjectProjection.spawn.source);
      if (subjectProjection.parentLink)
        frozenScan(
          options.parentSessionFile,
          subjectProjection.parentLink.source,
        );
      sameReadback(
        decodeReadback(
          Buffer.from(
            JSON.stringify(
              sourceReadback({
                repoRoot: options.repoRoot,
                unit: options.unit,
                reviewOutput: options.reviewOutput,
                localReceipt: options.localReceipt,
              }),
            ),
          ),
          ['review', 'local'],
        ),
        finalReadback,
      );
    };
    const ref = publishNativeCapture({
      repoRoot: ownedRoot,
      captureRoot: options.captureRoot,
      bytes: Buffer.from(`${JSON.stringify(snapshot, null, 2)}\n`),
      revalidate,
    });
    return { ref, snapshot };
  });
}

const FLAGS = [
  '--session-file',
  '--session-id',
  '--turn-id',
  '--parent-session-file',
  '--observer-session-file',
  '--unit',
  '--repo-root',
  '--source-head',
  '--review-output',
  '--local-receipt',
  '--capture-root',
  '--app-observation',
  '--route-witness',
];
export function captureMain(args) {
  const names = args.filter((arg) => arg.startsWith('--'));
  identityCheck(
    new Set(names).size === names.length,
    'duplicate native capture arguments',
  );
  const options = parseFlags(args, { strings: FLAGS });
  requireFlags(
    options,
    FLAGS.filter((f) => f !== '--parent-session-file').map((f) =>
      f.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
    ),
  );
  const result = captureNativeIdentity(options);
  console.log(JSON.stringify(result.ref));
  return result;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    captureMain(process.argv.slice(2));
  } catch (error) {
    const safe =
      error instanceof LoopScriptError &&
      ['NATIVE_CAPTURE_REFUSED', 'REVIEW_IDENTITY_INVALID'].includes(
        error.code,
      );
    console.error(
      safe
        ? `${error.code}: ${error.message}`
        : 'NATIVE_CAPTURE_REFUSED: native capture arguments or boundary refused',
    );
    process.exitCode = 1;
  }
}
