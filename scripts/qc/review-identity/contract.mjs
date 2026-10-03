/** Identity schema facts. Canonical rules: openspec/planning/2026-09-12-roadmap-completion/WORKERS.md. */
import { isDeepStrictEqual, TextDecoder } from 'node:util';
import { gzipSync, gunzipSync } from 'node:zlib';

import { HEX40, refuse, sha256 } from '../roadmap-loop-runtime.mjs';

export const identityCheck = (condition, message) => {
  if (!condition) refuse('REVIEW_IDENTITY_INVALID', message);
};
export const exactKeys = (value, fields) => {
  identityCheck(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      isDeepStrictEqual(
        Object.keys(value).sort(),
        Object.keys(fields).sort(),
      ) &&
      Object.entries(fields).every(([key, rule]) =>
        typeof rule === 'function' ? rule(value[key]) : value[key] === rule,
      ),
    `invalid identity fields: ${Object.keys(fields).join(', ')}`,
  );
  return true;
};
export const nonempty = (v) => typeof v === 'string' && v.trim().length > 0;
const TASK = /^st_[0-9a-f]{8}$/;
const SESSION =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const taskId = (v) => nonempty(v) && TASK.test(v);
export const sessionId = (v) => nonempty(v) && SESSION.test(v);

// Keep the old nonempty SHA predicate exact; native strictness is a separate schema.
export const checkRef = (ref) =>
  exactKeys(ref, {
    path: nonempty,
    sha256: nonempty,
    bytes: (v) => Number.isSafeInteger(v) && v > 0,
  });
export const observedEngine = (record) => ({
  task_id: record.task_id,
  child_session_id: record.child_session_id,
  model: record.model,
  execution_mode: record.execution_mode,
  agent_type: record.agent_type ?? null,
  resolved_model: {
    provider: record.resolved_model?.provider,
    model_id: record.resolved_model?.model_id,
  },
});
export const checkEngine = (engine) =>
  exactKeys(engine, {
    task_id: taskId,
    child_session_id: sessionId,
    model: `${engine?.resolved_model?.provider}/${engine?.resolved_model?.model_id}`,
    execution_mode: nonempty,
    agent_type: (v) => v === null || nonempty(v),
    resolved_model: (r) =>
      exactKeys(r, { provider: nonempty, model_id: nonempty }),
  });

// Native schema facts are distinct from the unchanged Senpi predicates above.
const SHA64 = /^[0-9a-f]{64}$/;
export const nativeHash = (v) => typeof v === 'string' && SHA64.test(v);
export const nativeEffort = (v) => ['high', 'xhigh'].includes(v);
export const nativeCallId = (v) =>
  typeof v === 'string' && v.startsWith('exec-') && sessionId(v.slice(5));
export const spawnCallId = (v) =>
  typeof v === 'string' && /^call_[A-Za-z0-9]+$/.test(v);
export const agentPath = (v) =>
  typeof v === 'string' && /^\/root\/[a-z0-9_]+$/.test(v);
export const plainPathText = (value) =>
  typeof value === 'string' &&
  !Array.from(value).some((character) => character.codePointAt(0) < 32);
export const relativePath = (v) =>
  nonempty(v) &&
  plainPathText(v) &&
  !/[\\:]/.test(v) &&
  !v.startsWith('/') &&
  v.split('/').every((p) => p && p !== '.' && p !== '..');
export const nativeRows = (v, check) => Array.isArray(v) && v.every(check);
export const NATIVE_PRIVATE_ROOTS = Object.freeze([
  '.omo/evidence/codex-native-contract/CNI1',
  '.next',
  'node_modules',
]);
export const privateQaPath = (file) =>
  NATIVE_PRIVATE_ROOTS.some(
    (root) => file === root || file.startsWith(`${root}/`),
  );
export const nativeText = (bytes) =>
  new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
export const nativeJson = (bytes) => {
  try {
    return JSON.parse(
      Buffer.isBuffer(bytes)
        ? nativeText(bytes)
        : nativeText(nativeUtf8(bytes)),
    );
  } catch {
    identityCheck(false, 'native UTF8/JSON malformed');
  }
};
export const nativeUtf8 = (value) => {
  identityCheck(typeof value === 'string', 'native text missing');
  const bytes = Buffer.from(value, 'utf8');
  identityCheck(nativeText(bytes) === value, 'native text has invalid Unicode');
  return bytes;
};
export const nativeBlob = (value) =>
  exactKeys(value, {
    bytes: (n) => Number.isSafeInteger(n) && n >= 0,
    sha256: nativeHash,
  });
export const blobRef = (bytes) => ({
  bytes: bytes.length,
  sha256: sha256(bytes),
});
export const nativeRef = (value) =>
  exactKeys(value, {
    path: relativePath,
    sha256: nativeHash,
    bytes: (n) => Number.isSafeInteger(n) && n >= 0,
  });
export const nativeRecord = (value) =>
  exactKeys(value, {
    ordinal: (n) => Number.isSafeInteger(n) && n >= 0,
    offset: (n) => Number.isSafeInteger(n) && n >= 0,
    bytes: (n) => Number.isSafeInteger(n) && n > 0,
    sha256: nativeHash,
  });
export const nativePrefix = (value) => {
  exactKeys(value, {
    prefixBytes: (n) => Number.isSafeInteger(n) && n > 0,
    prefixSha256: nativeHash,
    records: (r) => nativeRows(r, nativeRecord) && r.length > 0,
  });
  identityCheck(
    new Set(value.records.map((r) => r.ordinal)).size ===
      value.records.length &&
      value.records.every(
        (r, i) =>
          r.offset <= value.prefixBytes - r.bytes &&
          (!i ||
            r.offset >=
              value.records[i - 1].offset + value.records[i - 1].bytes),
      ),
    'native record bounds/order/duplicates',
  );
  return true;
};
export const checkNativeActor = (value) => {
  const child = value?.adapterVersion === 'codex-child-0.160.0-v2';
  exactKeys(value, {
    adapterVersion: child
      ? 'codex-child-0.160.0-v2'
      : 'codex-root-0.159.0-alpha.12.1',
    sessionId,
    modelProvider: 'openai',
    originator: 'codex_work_desktop',
    cliVersion: child ? '0.160.0' : '0.159.0-alpha.12.1',
    source: child ? 'thread_spawn' : 'vscode',
    ...(child
      ? {
          parentSessionId: sessionId,
          agentPath,
          agentRole: (v) => nonempty(v) && /^[a-z][a-z0-9-]*$/.test(v),
          depth: 1,
          multiAgentVersion: 'v2',
        }
      : { threadSource: 'user' }),
    turns: (v) =>
      nativeRows(v, (turn) =>
        exactKeys(turn, {
          turnId: sessionId,
          model: 'gpt-6.1-sol',
          effort: nativeEffort,
          ...(child || Object.hasOwn(turn, 'rootTurnId')
            ? { rootTurnId: sessionId }
            : {}),
        }),
      ) && v.length > 0,
  });
  identityCheck(
    new Set(value.turns.map((t) => t.turnId)).size === value.turns.length &&
      (!child || value.parentSessionId !== value.sessionId),
    'native actor turn/self-parent ambiguity',
  );
  identityCheck(
    new Set(value.turns.map((t) => t.effort)).size === 1,
    'native contributing effort changed',
  );
  return true;
};
export const nativeCensusActor = (value) =>
  exactKeys(value, {
    role: (v) => ['author', 'finisher'].includes(v),
    sessionId,
    model: 'openai/gpt-6.1-sol',
    ...(Object.hasOwn(value, 'agentPath') ? { agentPath } : {}),
  });
export const checkReadbacks = (value, artifacts = []) =>
  exactKeys(value, {
    privateRoots: (v) => isDeepStrictEqual(v, NATIVE_PRIVATE_ROOTS),
    head: (h) => typeof h === 'string' && HEX40.test(h),
    tree: (h) => typeof h === 'string' && HEX40.test(h),
    index: nativeBlob,
    inventory: nativeBlob,
    diff: nativeBlob,
    status: nativeBlob,
    files: (v) =>
      nativeRows(v, nativeRef) &&
      v.length > 0 &&
      new Set(v.map((r) => r.path.toLowerCase())).size === v.length,
    ...Object.fromEntries(artifacts.map((name) => [name, nativeBlob])),
  });
export const originalWitness = (value) => {
  exactKeys(value, {
    utf8: nonempty,
    bytes: (n) => Number.isSafeInteger(n) && n > 0,
    sha256: nativeHash,
  });
  const bytes = nativeUtf8(value.utf8);
  identityCheck(
    bytes.length === value.bytes && sha256(bytes) === value.sha256,
    'native original witness byte binding',
  );
  return nativeJson(value.utf8);
};

export const identityOne = (records, message) => {
  identityCheck(records.length === 1, message);
  return records[0];
};

const readbackBase64 = (encoded) => {
  identityCheck(
    typeof encoded === 'string' &&
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        encoded,
      ),
    'native readback encoding invalid',
  );
  const decoded = Buffer.from(encoded, 'base64');
  identityCheck(
    decoded.toString('base64') === encoded,
    'native readback encoding ambiguous',
  );
  return decoded;
};

const READBACK_PART_BYTES = 280 * 1024;
const gzipReadback = (bytes) => gzipSync(bytes, { level: 9 });
export function encodeReadbackChunk(value, index) {
  const original = Buffer.from(`${JSON.stringify(value)}\n`);
  const compressed = gzipReadback(original);
  const count = Math.ceil(compressed.length / READBACK_PART_BYTES);
  identityCheck(
    Number.isSafeInteger(index) && index >= 0 && index < count,
    'native chunk index outside batch',
  );
  const offset = index * READBACK_PART_BYTES;
  const part = compressed.subarray(
    offset,
    Math.min(offset + READBACK_PART_BYTES, compressed.length),
  );
  return {
    readbackVersion: 2,
    encoding: 'gzip-base64',
    original: blobRef(original),
    batch: blobRef(compressed),
    index,
    count,
    offset,
    part: blobRef(part),
    base64: part.toString('base64'),
  };
}

function joinReadbackChunks(envelopes) {
  const first = envelopes[0];
  const parts = envelopes.map((envelope, index) => {
    exactKeys(envelope, {
      readbackVersion: 2,
      encoding: 'gzip-base64',
      original: nativeBlob,
      batch: nativeBlob,
      index: (n) => Number.isSafeInteger(n) && n >= 0,
      count: (n) => Number.isSafeInteger(n) && n > 0,
      offset: (n) => Number.isSafeInteger(n) && n >= 0,
      part: nativeBlob,
      base64: (v) => typeof v === 'string',
    });
    identityCheck(
      envelope.index === index &&
        envelope.count === envelopes.length &&
        envelope.count ===
          Math.ceil(envelope.batch.bytes / READBACK_PART_BYTES) &&
        isDeepStrictEqual(envelope.original, first.original) &&
        isDeepStrictEqual(envelope.batch, first.batch) &&
        envelope.offset === index * READBACK_PART_BYTES,
      'native chunk group gap/duplicate/order/batch mismatch',
    );
    const part = readbackBase64(envelope.base64);
    identityCheck(
      part.length ===
        Math.min(READBACK_PART_BYTES, envelope.batch.bytes - envelope.offset) &&
        isDeepStrictEqual(blobRef(part), envelope.part),
      'native chunk length/hash mismatch',
    );
    return part;
  });
  const compressed = Buffer.concat(parts);
  identityCheck(
    isDeepStrictEqual(blobRef(compressed), first.batch) &&
      first.original.bytes > 0,
    'native aggregate chunk hash/bytes mismatch',
  );
  let original;
  try {
    original = gunzipSync(compressed, {
      maxOutputLength: first.original.bytes,
    });
  } catch {
    identityCheck(false, 'native compressed readback incomplete/malformed');
  }
  identityCheck(
    isDeepStrictEqual(blobRef(original), first.original) &&
      gzipReadback(original).equals(compressed),
    'native original bytes/hash or trailing/noncanonical compression',
  );
  return original;
}

export function decodeReadback(stdout, artifacts = []) {
  const carriers = Array.isArray(stdout) ? stdout : [stdout];
  identityCheck(carriers.length > 0, 'native readback group empty');
  const envelopes = carriers.map(nativeJson);
  const original =
    envelopes[0].readbackVersion === 2
      ? joinReadbackChunks(envelopes)
      : (identityCheck(carriers.length === 1, 'mixed native readback versions'),
        carriers[0]);
  const value = nativeJson(original);
  exactKeys(value, {
    readbackVersion: 1,
    privateRoots: Array.isArray,
    head: (v) => typeof v === 'string',
    tree: (v) => typeof v === 'string',
    index: (v) => typeof v === 'string',
    inventory: (v) => typeof v === 'string',
    diff: (v) => typeof v === 'string',
    status: (v) => typeof v === 'string',
    files: Array.isArray,
    ...Object.fromEntries(
      artifacts.map((name) => [name, (v) => typeof v === 'string']),
    ),
  });
  const fileBytes = value.files.map((ref) => {
    exactKeys(ref, {
      path: relativePath,
      base64: (v) => typeof v === 'string',
    });
    return { path: ref.path, bytes: readbackBase64(ref.base64) };
  });
  return {
    readbacks: {
      privateRoots: value.privateRoots,
      head: value.head,
      tree: value.tree,
      ...Object.fromEntries(
        ['index', 'inventory', 'diff', 'status', ...artifacts].map((name) => [
          name,
          blobRef(readbackBase64(value[name])),
        ]),
      ),
      files: fileBytes.map((ref) => ({
        path: ref.path,
        ...blobRef(ref.bytes),
      })),
    },
    fileBytes,
    artifacts: Object.fromEntries(
      artifacts.map((name) => [name, readbackBase64(value[name])]),
    ),
  };
}
