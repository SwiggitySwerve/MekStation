/**
 * The pending-write marker and the decision a reloaded document makes with it.
 *
 * A campaign edit only reaches the server after a 2 s debounce, and the
 * discard-time keepalive flush is best effort: a crash, a power loss, an
 * offline PUT, or a request the browser drops all leave the same state - a
 * browser copy that is NEWER than the server's, with `dirty` gone because
 * `dirty` is a fact about the document, not about the copy. Without more
 * evidence the load path saw a copy whose cache key equals the server's and
 * stamped it `saved`, or saw a diverged key and replaced the copy whole. Both
 * lose the edit silently.
 *
 * The marker is that evidence. It is written in the same task as the edit,
 * persisted WITH the copy it describes, and cleared only when the copy is
 * acknowledged. "Newer" is decided on the server row `version` against the
 * marker's `baseVersion`, never on a timestamp: a clock is never read, so
 * skewed clocks and several tabs cannot reorder anything.
 *
 * Pure on purpose. It reads no store, no clock and no network; the caller
 * supplies every fact and applies the verdict.
 *
 * @spec openspec/changes/adopt-pending-campaign-write/specs/campaign-persistence/spec.md
 */

/** What the last discard-time flush sent: evidence, never an acknowledgement. */
export interface IPendingWriteFlush {
  /** The compare-and-swap token the flush wrote against. */
  readonly baseVersion: number;
  /** The edit counter when the flush was issued. */
  readonly editSeq: number;
  /** Digest of the envelope the flush carried (`flushedEnvelopeDigest`). */
  readonly digest: string;
}

/** The unsaved-edit claim a copy carries until a save acknowledges it. */
export interface IPendingWrite {
  readonly campaignId: string;
  /** The server row version the local edits were built on. */
  readonly baseVersion: number;
  /** The local edit counter; compared only against `flush.editSeq`. */
  readonly editSeq: number;
  readonly flush?: IPendingWriteFlush;
}

/** The conflict reason a pending write that cannot be pushed reports. */
export const PENDING_WRITE_CONFLICT_REASON = 'local-edits-predate-server';

function isCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseFlush(value: unknown): IPendingWriteFlush | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const flush = value as Partial<IPendingWriteFlush>;
  if (
    !isCounter(flush.baseVersion) ||
    !isCounter(flush.editSeq) ||
    typeof flush.digest !== 'string' ||
    flush.digest === ''
  ) {
    return undefined;
  }
  return {
    baseVersion: flush.baseVersion,
    editSeq: flush.editSeq,
    digest: flush.digest,
  };
}

/**
 * Validates a persisted marker. A malformed marker is ABSENT, never repaired
 * (a half-readable claim is not a weaker truth). A malformed `flush` alone is
 * dropped: with less evidence the decision can only say "conflict", which is
 * the safe direction.
 */
export function parsePendingWrite(value: unknown): IPendingWrite | null {
  if (typeof value !== 'object' || value === null) return null;
  const marker = value as Partial<IPendingWrite>;
  if (
    typeof marker.campaignId !== 'string' ||
    marker.campaignId === '' ||
    !isCounter(marker.baseVersion) ||
    !isCounter(marker.editSeq)
  ) {
    return null;
  }
  const flush = parseFlush(marker.flush);
  return {
    campaignId: marker.campaignId,
    baseVersion: marker.baseVersion,
    editSeq: marker.editSeq,
    ...(flush ? { flush } : {}),
  };
}

export function pendingWritesEqual(
  a: IPendingWrite | null,
  b: IPendingWrite | null,
): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.campaignId === b.campaignId &&
    a.baseVersion === b.baseVersion &&
    a.editSeq === b.editSeq &&
    a.flush?.baseVersion === b.flush?.baseVersion &&
    a.flush?.editSeq === b.flush?.editSeq &&
    a.flush?.digest === b.flush?.digest
  );
}

/** The facts the marker is derived from; all read in the writer's own task. */
export interface IPendingWriteSource {
  readonly dirty: boolean;
  readonly campaignId: string | null;
  readonly baseVersion: number;
  readonly editSeq: number;
  readonly legacyUnadopted: boolean;
  readonly liveCampaignId: string | null;
  /** Host or guest: the session, not the PUT path, is that copy's writer. */
  readonly liveIsCoop: boolean;
}

/**
 * The marker for the current persistence state.
 *
 * - `null`: nothing is owed (clean), or this copy has no ordinary save to be
 *   behind on (co-op, unadopted legacy, another campaign's state).
 * - `undefined`: LEAVE the stored marker alone. A fresh document is dirty with
 *   `baseVersion` 0 until its first read lands; deriving from that would
 *   overwrite the previous document's real marker with a base it never had.
 * - a marker otherwise. `flush` is kept only while it still describes the same
 *   base: a base change means a save or a proven flush moved the row past it.
 */
export function derivePendingWrite(
  source: IPendingWriteSource,
  previous: IPendingWrite | null,
  flush?: IPendingWriteFlush,
): IPendingWrite | null | undefined {
  if (!source.dirty) return null;
  const campaignId = source.campaignId ?? source.liveCampaignId;
  if (
    campaignId === null ||
    source.legacyUnadopted ||
    source.liveIsCoop ||
    (source.liveCampaignId !== null && source.liveCampaignId !== campaignId)
  ) {
    return null;
  }
  if (source.baseVersion <= 0) return undefined;
  const carried =
    flush ??
    (previous?.campaignId === campaignId &&
    previous.flush?.baseVersion === source.baseVersion
      ? previous.flush
      : undefined);
  return {
    campaignId,
    baseVersion: source.baseVersion,
    editSeq: source.editSeq,
    ...(carried ? { flush: carried } : {}),
  };
}

export type PendingWriteConflictCause =
  /** The copy cannot prove which server instance it was built on. */
  | 'instance-unproven'
  /** Another writer, a rollback or a restore moved the row. */
  | 'version-moved';

export type PendingWriteDecision =
  /** Nothing is owed here: existing load behaviour. */
  | { readonly kind: 'none' }
  /** The server holds our flush and nothing newer exists locally. */
  | { readonly kind: 'adopt-flushed' }
  /**
   * Keep the local copy, mark it dirty at `record.version` and arm the
   * ordinary save. `viaFlush` when the row is our own flush plus later edits.
   */
  | { readonly kind: 'keep-local'; readonly viaFlush: boolean }
  /** No push and no replace; the user chooses. */
  | {
      readonly kind: 'conflict';
      readonly cause: PendingWriteConflictCause;
      readonly localBaseVersion: number;
    };

export interface IPendingWriteDecisionInput {
  readonly marker: IPendingWrite | null;
  readonly liveCampaignId: string | null;
  readonly liveIsCoop: boolean;
  /** `cachedCampaignKey.instanceId`: the instance the copy was built on. */
  readonly cachedInstanceId: string | null;
  readonly record: {
    readonly campaignId: string;
    readonly version: number;
    readonly instanceId?: string | null;
  };
  /** Lazy: only a flush-bearing marker at the right version needs it. */
  readonly digestOf: () => string;
  /** An edit this document made before its first read landed. */
  readonly editedBeforeLoad: boolean;
}

/** The section 3 decision table, in order. */
export function decidePendingWrite(
  input: IPendingWriteDecisionInput,
): PendingWriteDecision {
  const { marker, record } = input;
  if (
    marker === null ||
    marker.campaignId !== record.campaignId ||
    input.liveCampaignId !== marker.campaignId ||
    input.liveIsCoop
  ) {
    return { kind: 'none' };
  }
  // The version comparison means nothing across hosts: two servers are both
  // at revision 7 and are not the same campaign.
  if (
    input.cachedInstanceId === null ||
    input.cachedInstanceId !== (record.instanceId ?? null)
  ) {
    return {
      kind: 'conflict',
      cause: 'instance-unproven',
      localBaseVersion: marker.baseVersion,
    };
  }
  const { flush } = marker;
  if (
    flush !== undefined &&
    record.version === flush.baseVersion + 1 &&
    input.digestOf() === flush.digest
  ) {
    return marker.editSeq === flush.editSeq && !input.editedBeforeLoad
      ? { kind: 'adopt-flushed' }
      : { kind: 'keep-local', viaFlush: true };
  }
  if (record.version === marker.baseVersion) {
    return { kind: 'keep-local', viaFlush: false };
  }
  return {
    kind: 'conflict',
    cause: 'version-moved',
    localBaseVersion: marker.baseVersion,
  };
}
