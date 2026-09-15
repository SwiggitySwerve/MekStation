/**
 * S3-a of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.3, first
 * sub-prefix): answer "has journal authority started for this match
 * stream?" from S1's real journal state.
 *
 * WHY THIS EXISTS. Two facts currently claim to answer that question.
 * The `mp_journal_authority_started` marker (written by the older,
 * still-off task-2.3/2.4 path) is one; S1's mirror, which installs the
 * stream head and the match's genesis / effective-head row on the
 * first committed batch, is the other. Task 1.3 retires the marker so
 * there is ONE source of "started" — this module is that source, added
 * BESIDE the marker read so a caller can be repointed in a later slice
 * with the two answers still separately observable.
 *
 * THE DEFINITION. Started means the stream has an effective head
 * installed in `event_history_effective_heads`. That row is chosen
 * deliberately over the journal tail: the mirror appends events,
 * installs `event_journal_stream_heads` and backfills genesis plus the
 * effective head in ONE transaction, so the head cannot exist without
 * the events — and the effective head is the exact row the S2 branch
 * admission consult and S4 recovery read, which makes "started" and
 * "the journal can answer for this match" the same fact rather than
 * two facts that can drift.
 *
 * BEFORE THE FIRST BATCH THE ANSWER IS FALSE, INCLUDING FOR A LIVE
 * MATCH. `ServerMatchHost.create` persists a match's initial events
 * through `appendEvent`, which is not the batch path and never
 * mirrors (measured in the S2 proof suite, evidence
 * `r4-s2-live-head-admission-local-20260915.json`). So a created,
 * event-carrying match whose first COMMAND BATCH has not committed is
 * honestly not started: no journal row of any kind exists for it.
 * This is S1's disclosed no-catch-up, not a bug in the derivation.
 *
 * THIS READS PERSISTED STATE, NEVER THE CUTOVER FLAG. At the shipped
 * mode (`off`) nothing mirrors, so every match answers false; a stream
 * mirrored while the mode was on keeps answering true after the mode
 * goes off, because the rows are still there and the question is about
 * the stream, not about this process's configuration.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S3)
 */

import {
  hasHistoryBranchStore,
  isHistoryBranchStoreReady,
} from '@/lib/events/storeCapabilityPorts';

import { MATCH_STREAM_TYPE } from './MatchStreamJournalMirror';

/**
 * The four head fields any consumer of "started" actually reads.
 *
 * `revision` and `digest` are deliberately absent: both recovery seeds
 * overwrite them from the command receipt and the refold
 * (`ServerMatchHost.journalHeadFromReceipt` / `refoldedJournalHead`),
 * so carrying them here would mean inventing two values nothing reads.
 * What survives from the started head into both seeds is exactly this
 * identity.
 */
export interface IMatchJournalAuthorityStartedHead {
  readonly streamType: typeof MATCH_STREAM_TYPE;
  readonly streamId: string;
  readonly branchId: string;
  readonly effectiveGeneration: number;
}

/**
 * Three answers, because two of them are not the same fact.
 *
 * `not-started` is a positive statement about the stream. `unavailable`
 * says the store COULD have journalled this match and cannot answer
 * right now — collapsing that into `not-started` is what would let a
 * started match be routed back to the legacy reader, across the one-way
 * boundary `matchRollbackReaderSelection` states at its `started == null`
 * branch.
 */
export type MatchJournalAuthorityStartedOutcome =
  | {
      readonly kind: 'started';
      readonly head: IMatchJournalAuthorityStartedHead;
    }
  | { readonly kind: 'not-started' }
  | { readonly kind: 'unavailable' };

/**
 * Derive "has journal authority started, and on which head" from the
 * mirrored effective head.
 *
 * A store with NO branch port answers `not-started`, and that is a
 * statement rather than a dodge: such a store has no journal at all, so
 * it cannot have mirrored anything, and every match on it is legacy by
 * construction. A store that HAS the port but whose capability database
 * is not open answers `unavailable` — it can journal, it may already
 * have started this match, and it simply cannot say.
 *
 * A persisted head naming a NON-EFFECTIVE branch throws
 * `EventHistoryBranchError('branch-integrity')` out of
 * `readEffectiveHead` and that refusal is deliberately NOT caught.
 * Such a head is corruption no activation can produce, and answering
 * "not started" would bury it under a legal-looking answer; the live
 * path already refuses that shape `MATCH_QUARANTINED` (History B,
 * PR #1674).
 */
export function deriveMatchJournalAuthorityStartedHead(
  store: object,
  matchId: string,
): MatchJournalAuthorityStartedOutcome {
  if (!hasHistoryBranchStore(store)) return { kind: 'not-started' };
  if (!isHistoryBranchStoreReady(store)) return { kind: 'unavailable' };
  const head = store.readEffectiveHead({
    streamType: MATCH_STREAM_TYPE,
    streamId: matchId,
  });
  if (head == null) return { kind: 'not-started' };
  return {
    kind: 'started',
    head: {
      streamType: MATCH_STREAM_TYPE,
      streamId: head.streamId,
      branchId: head.branchId,
      effectiveGeneration: head.effectiveGeneration,
    },
  };
}
