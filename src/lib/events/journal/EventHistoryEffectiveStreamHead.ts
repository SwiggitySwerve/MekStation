/**
 * The journal head the stream is currently answering from.
 *
 * `event_journal_stream_heads` is keyed (stream_type, stream_id, branch_id).
 * Since migration 26 a stream may hold several rows: the effective branch
 * at its live revision, and every C1a candidate planted at its base,
 * below that revision. Selecting without naming a branch lets SQLite
 * return an arbitrary row - and the PK order hits `candidate-1` before
 * `root`, so the candidate's lower revision wins. Callers that then
 * compare that revision (or its digest) against the true head refuse
 * STALE_REVISION / STALE_DIGEST forever.
 *
 * Absence is an answer: a stream with no effective branch, or no head
 * row on the one it has, sits at revision 0 on the genesis digest. That
 * is the same missing-row behaviour the unqualified reads used to
 * return, not a throw. The genesis branch id is only the identity an
 * empty journal already uses; it is not an installed effective branch.
 */

import type Database from 'better-sqlite3';

import type { IEventHistoryStreamRef } from './EventHistoryBranchContract';
import type { SQLiteEventHistoryBranchStore } from './SQLiteEventHistoryBranchStore';

import { EVENT_HISTORY_GENESIS_DIGEST } from './EventHistoryBranchContract';
import { ROOT_EVENT_BRANCH_ID } from './EventJournalContract';

export interface IEventHistoryEffectiveStreamHead {
  readonly branchId: string;
  readonly revision: number;
  readonly digest: string;
}

const MISSING_HEAD: IEventHistoryEffectiveStreamHead = Object.freeze({
  branchId: ROOT_EVENT_BRANCH_ID,
  revision: 0,
  digest: EVENT_HISTORY_GENESIS_DIGEST,
});

export function readEffectiveStreamHead(
  db: Database.Database,
  branches: SQLiteEventHistoryBranchStore,
  stream: IEventHistoryStreamRef,
): IEventHistoryEffectiveStreamHead {
  // readEffectiveHead, never requireEffectiveHead: a stream that has
  // not been backfilled is genesis, not a crash.
  const effective = branches.readEffectiveHead(stream);
  if (effective === null) return MISSING_HEAD;
  const row = db
    .prepare(
      `SELECT stream_revision AS revision, event_digest AS digest
         FROM event_journal_stream_heads
        WHERE stream_type = ? AND stream_id = ? AND branch_id = ?`,
    )
    .get(stream.streamType, stream.streamId, effective.branchId) as
    | { readonly revision: number; readonly digest: string }
    | undefined;
  if (row === undefined) {
    return Object.freeze({
      branchId: effective.branchId,
      revision: 0,
      digest: EVENT_HISTORY_GENESIS_DIGEST,
    });
  }
  return Object.freeze({
    branchId: effective.branchId,
    revision: row.revision,
    digest: row.digest,
  });
}
