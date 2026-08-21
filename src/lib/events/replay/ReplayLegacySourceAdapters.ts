/**
 * Legacy source-format adapters (replay-safety PR 2).
 *
 * A versionless legacy event may receive baseline schema v1 ONLY through one
 * of the named adapters below — never through a global implicit version
 * default. Each attribution binds pre-normalization source evidence at bind
 * time (exact raw line bytes for a byte-backed source; a versioned canonical
 * snapshot for an object-backed source), hashes it, and retains the source
 * identity, so later mutation of the caller's buffer or record can neither
 * change nor detach the captured evidence.
 *
 * Not wired to production replay: per the change law, no partial schema pack
 * or adapter reaches production replay/recovery/authority until the task-11
 * exhaustive-composition proof.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/replay-library/spec.md
 */

import { sha256 } from 'js-sha256';

import { canonicalizeJsonV1 } from '../journal/EventJournalCanonicalizer';

export type LegacySourceBinding = 'byte-backed' | 'object-backed';

export interface ILegacySourceFormat {
  readonly formatId: string;
  readonly formatVersion: number;
  readonly binding: LegacySourceBinding;
  readonly description: string;
}

/**
 * The complete inventory of currently readable versionless sources (task
 * 2.1). Anything absent from this table is an unknown source format and is
 * rejected — replay never assumes baseline v1 for it.
 */
export const LEGACY_SOURCE_FORMATS: readonly ILegacySourceFormat[] =
  Object.freeze([
    Object.freeze({
      formatId: 'simulation-report-jsonl',
      formatVersion: 1,
      binding: 'byte-backed' as const,
      description:
        'Versionless combat IGameEvent lines in simulation-reports/<source>/<gameId>.jsonl',
    }),
    Object.freeze({
      formatId: 'match-log-idb',
      formatVersion: 2,
      binding: 'object-backed' as const,
      description:
        'Versionless IGameEvent records in the mekstation-match-log IndexedDB matchEvents store (MATCH_LOG_DB_VERSION 2)',
    }),
    Object.freeze({
      formatId: 'campaign-sync-envelope',
      formatVersion: 1,
      binding: 'object-backed' as const,
      description:
        'Versionless ICampaignEvent envelopes delivered over the co-op campaign-sync transport',
    }),
    // Registered by replay-safety PR 19B (live catch-up integration).
    Object.freeze({
      formatId: 'match-broadcast',
      formatVersion: 1,
      binding: 'object-backed' as const,
      description:
        'Versionless IGameEvent payloads delivered over the multiplayer match wire broadcast/replay stream',
    }),
  ]);

export type LegacySourceAttributionCode =
  | 'unknown-source-format'
  | 'unknown-format-version'
  | 'binding-mismatch'
  | 'ambiguous-attribution'
  | 'invalid-source-event'
  | 'missing-event-version';

export class LegacySourceAttributionError extends Error {
  public readonly name = 'LegacySourceAttributionError';
  public constructor(
    public readonly code: LegacySourceAttributionCode,
    public readonly formatId: string,
    public readonly formatVersion: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ILegacySourceEvidence {
  readonly formatId: string;
  readonly formatVersion: number;
  readonly binding: LegacySourceBinding;
  /** sha256 hex over the bound pre-normalization evidence bytes. */
  readonly evidenceDigest: string;
  /** Byte length of the bound evidence. */
  readonly evidenceByteLength: number;
  /** Object-backed only: the versioned canonical snapshot the digest covers. */
  readonly canonicalSnapshot?: string;
}

export interface IAttributedLegacyEvent {
  readonly eventType: string;
  /** Legacy adapters attribute baseline v1 only — never any other version. */
  readonly schemaVersion: 1;
  readonly payload: unknown;
  readonly source: ILegacySourceEvidence;
}

function attributionFailure(
  code: LegacySourceAttributionCode,
  formatId: string,
  formatVersion: number,
  message: string,
): never {
  throw new LegacySourceAttributionError(
    code,
    formatId,
    formatVersion,
    message,
  );
}

function resolveFormat(
  formatId: string,
  formatVersion: number,
  expectedBinding: LegacySourceBinding,
): ILegacySourceFormat {
  const byId = LEGACY_SOURCE_FORMATS.filter(
    (format) => format.formatId === formatId,
  );
  if (byId.length === 0)
    attributionFailure(
      'unknown-source-format',
      formatId,
      formatVersion,
      `Unknown legacy source format ${formatId}`,
    );
  const format = byId.find((entry) => entry.formatVersion === formatVersion);
  if (!format)
    attributionFailure(
      'unknown-format-version',
      formatId,
      formatVersion,
      `Unknown version ${formatVersion} for legacy source format ${formatId}`,
    );
  if (format.binding !== expectedBinding)
    attributionFailure(
      'binding-mismatch',
      formatId,
      formatVersion,
      `${formatId} is ${format.binding}; a ${expectedBinding} bind cannot attribute it`,
    );
  return format;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Extract the discriminant and reject records that carry their own explicit
 * version identity: a record that already names an eventVersion or
 * schemaVersion belongs to the journal path, and letting a legacy adapter
 * re-attribute it to baseline v1 would be ambiguous attribution.
 */
function extractEventType(
  record: unknown,
  format: ILegacySourceFormat,
): string {
  if (record === null || typeof record !== 'object' || Array.isArray(record))
    attributionFailure(
      'invalid-source-event',
      format.formatId,
      format.formatVersion,
      'Legacy source event must be a JSON object',
    );
  const candidate = record as Record<string, unknown>;
  if ('eventVersion' in candidate || 'schemaVersion' in candidate)
    attributionFailure(
      'ambiguous-attribution',
      format.formatId,
      format.formatVersion,
      'Record carries an explicit version identity; legacy baseline attribution would be ambiguous',
    );
  const eventType = candidate['type'];
  if (typeof eventType !== 'string' || eventType.trim().length === 0)
    attributionFailure(
      'invalid-source-event',
      format.formatId,
      format.formatVersion,
      'Legacy source event has no string `type` discriminant',
    );
  return eventType;
}

function attribute(
  format: ILegacySourceFormat,
  record: unknown,
  evidenceDigest: string,
  evidenceByteLength: number,
  canonicalSnapshot?: string,
): IAttributedLegacyEvent {
  const eventType = extractEventType(record, format);
  const payload = deepFreeze(JSON.parse(canonicalizeJsonV1(record)));
  return Object.freeze({
    eventType,
    schemaVersion: 1 as const,
    payload,
    source: Object.freeze({
      formatId: format.formatId,
      formatVersion: format.formatVersion,
      binding: format.binding,
      evidenceDigest,
      evidenceByteLength,
      ...(canonicalSnapshot === undefined ? {} : { canonicalSnapshot }),
    }),
  });
}

/**
 * Bind one byte-backed legacy event to its exact raw line bytes. The digest
 * is computed from a private copy taken before parsing, so later caller
 * mutation of the passed buffer cannot change the captured evidence.
 */
export function bindLegacyByteEvent(
  formatId: string,
  formatVersion: number,
  rawLine: Uint8Array,
): IAttributedLegacyEvent {
  const format = resolveFormat(formatId, formatVersion, 'byte-backed');
  const bound = Uint8Array.from(rawLine);
  const evidenceDigest = sha256(bound);
  let record: unknown;
  try {
    record = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bound),
    );
  } catch {
    attributionFailure(
      'invalid-source-event',
      formatId,
      formatVersion,
      'Raw line bytes are not one valid UTF-8 JSON value',
    );
  }
  return attribute(format, record, evidenceDigest, bound.byteLength);
}

/**
 * Bind one object-backed legacy record to an immutable pre-normalization
 * snapshot using the journal's versioned canonical JSON encoding. The
 * snapshot and digest are captured at bind time, so later caller mutation of
 * the record cannot change or detach the evidence.
 */
export function bindLegacyObjectEvent(
  formatId: string,
  formatVersion: number,
  record: unknown,
): IAttributedLegacyEvent {
  const format = resolveFormat(formatId, formatVersion, 'object-backed');
  let canonicalSnapshot: string;
  try {
    canonicalSnapshot = canonicalizeJsonV1(record);
  } catch {
    attributionFailure(
      'invalid-source-event',
      formatId,
      formatVersion,
      'Record is not canonically encodable',
    );
  }
  const bytes = new TextEncoder().encode(canonicalSnapshot);
  return attribute(
    format,
    JSON.parse(canonicalSnapshot),
    sha256(bytes),
    bytes.byteLength,
    canonicalSnapshot,
  );
}

/**
 * Journal envelopes require an explicit event version — this is the typed
 * replacement for any "missing version means v1" fallback, which remains
 * prohibited (only the named adapters above may attribute baseline v1).
 */
export function requireJournalEventVersion(envelope: {
  readonly eventVersion?: unknown;
}): number {
  const version = envelope.eventVersion;
  if (!Number.isSafeInteger(version) || (version as number) < 1)
    attributionFailure(
      'missing-event-version',
      'journal-envelope',
      0,
      'Journal envelope has no explicit eventVersion; implicit version defaults are prohibited',
    );
  return version as number;
}
