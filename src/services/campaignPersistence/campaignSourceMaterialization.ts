/**
 * Fenced source materialization of the `campaigns` row (task 6.1 / P0b).
 *
 * The write itself, split out of `CampaignPersistenceService` so that module
 * keeps describing the whole-envelope PUT path — the `baseVersion` CAS, the
 * D2 gate, and the `sourceReplayFence` guard that rejects a later generic
 * overwrite — while this one owns the borrowed-handle write that STAMPS that
 * fence. The two halves of the fence therefore sit either side of one import
 * rather than inside one 600-line module.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D12)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 */

import type Database from 'better-sqlite3';

import type {
  ICampaignSourceReplayFence,
  SerializedCampaign,
} from '@/types/campaign/SerializedCampaign';

/** Why a fenced source materialization did not write the row. */
export const STALE_REPLAY_FENCE_REASON = 'stale-replay-fence' as const;

export type CampaignMaterializeResult =
  | { readonly kind: 'ok'; readonly version: number }
  /** The row already stands AT this watermark; a second apply is not a write. */
  | { readonly kind: 'noop'; readonly reason: 'already-at-fence' }
  /** The caller stands BEHIND the row's watermark; applying would regress it. */
  | {
      readonly kind: 'refused';
      readonly reason: typeof STALE_REPLAY_FENCE_REASON;
    }
  /** Something else moved the row since the caller read it. */
  | { readonly kind: 'conflict'; readonly currentVersion: number };

/**
 * Write a source MATERIALIZATION of the campaigns row on a BORROWED handle,
 * under the same compare-and-swap this service already enforces, stamping the
 * durable `sourceReplayFence` the write is judged by next time.
 *
 * The handle is the caller's, not one opened here, because the only correct
 * caller is inside the journal's prepared transaction
 * (`SQLiteEventJournalWriter.appendPreparedWithExtension`): the read that
 * authorised the materialization, the append that records it, and this write
 * are one immediate transaction, so no rival PUT has a window between them.
 * Opening a handle here would reintroduce that window while looking identical
 * at the call site — the same trap `readCampaignSourceMarket` documents.
 *
 * ORDER IS LOAD-BEARING: the fence is judged BEFORE the CAS. A replay of a
 * prefix already materialized necessarily carries the version it read before
 * that materialization moved the row, so a CAS-first reading would report
 * `conflict` for the one case that must be a silent no-op.
 *
 * The fence is stamped HERE rather than accepted from the caller, for the
 * same reason `buildCampaignSourcePrivateEnvelope` derives its own digest: a
 * caller must not be able to record a watermark that disagrees with the write
 * it actually performed.
 */
export function materializeCampaignSourceRow(
  db: Database.Database,
  args: {
    readonly campaignId: string;
    /** Row `version` the caller read; the compare-and-swap token. */
    readonly expectedRowVersion: number;
    /** Journal revision this materialization covers, inclusive. */
    readonly fenceRevision: number;
    /** The record the row becomes, before the fence is stamped on it. */
    readonly record: SerializedCampaign;
    readonly nextVersion: number;
  },
): CampaignMaterializeResult {
  const row = db
    .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
    .get(args.campaignId) as
    | { readonly version: number; readonly payload: string }
    | undefined;
  if (row === undefined) {
    // No row to materialize onto. Reported as a conflict at version 0 rather
    // than as a fence problem: the caller read SOMETHING, so the row was
    // deleted under it.
    return { kind: 'conflict', currentVersion: 0 };
  }

  const storedFence = storedReplayFenceOf(row.payload);
  if (storedFence !== null) {
    if (storedFence.rootPublicRevision === args.fenceRevision) {
      return { kind: 'noop', reason: 'already-at-fence' };
    }
    if (storedFence.rootPublicRevision > args.fenceRevision) {
      return { kind: 'refused', reason: STALE_REPLAY_FENCE_REASON };
    }
  }

  if (row.version !== args.expectedRowVersion) {
    return { kind: 'conflict', currentVersion: row.version };
  }

  const stored: SerializedCampaign = {
    ...args.record,
    version: args.nextVersion,
    sourceReplayFence: { rootPublicRevision: args.fenceRevision },
  };
  const changes = db
    .prepare(
      'UPDATE campaigns SET payload = ?, version = ? WHERE id = ? AND version = ?',
    )
    .run(
      JSON.stringify(stored),
      stored.version,
      args.campaignId,
      args.expectedRowVersion,
    ).changes;
  // The predicate is redundant inside the prepared transaction and is kept
  // anyway: a CAS that only holds because of where it is called from is one
  // refactor away from not holding at all.
  if (changes === 0) {
    return { kind: 'conflict', currentVersion: row.version };
  }
  return { kind: 'ok', version: stored.version };
}

/**
 * Drop whatever fence an INCOMING envelope carried. The fence is a
 * server-owned fact like `instanceId` and `authority`: a client echoes it to
 * prove it has seen the materialization, and never gets to set or advance it.
 */
export function withoutClientFence(
  record: SerializedCampaign,
): SerializedCampaign {
  const copy = { ...record };
  delete (copy as { sourceReplayFence?: ICampaignSourceReplayFence })
    .sourceReplayFence;
  return copy;
}

/**
 * Read the stored row's fence without hydrating it. Total: an unreadable or
 * unshaped payload simply carries no fence, which leaves the guards inert
 * rather than throwing out of a caller's transaction.
 */
export function storedReplayFenceOf(
  payload: string,
): ICampaignSourceReplayFence | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const fence = (parsed as { readonly sourceReplayFence?: unknown })
    .sourceReplayFence;
  if (typeof fence !== 'object' || fence === null) return null;
  const revision = (fence as { readonly rootPublicRevision?: unknown })
    .rootPublicRevision;
  return typeof revision === 'number' ? { rootPublicRevision: revision } : null;
}
