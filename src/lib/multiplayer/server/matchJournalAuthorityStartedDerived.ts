/**
 * S3-a of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.3, first
 * sub-prefix): answer "has journal authority started for this match
 * stream?" from S1's real journal state.
 *
 * Started means the stream has an effective head in
 * `event_history_effective_heads`, not a separate started marker.
 * The journal writer installs genesis and the effective head with the
 * stream's first append, in the same transaction as its events and head.
 * No global backfill is needed to install a newly appended stream.
 *
 * `ServerMatchHost.create` persists its opening events and asks the store
 * to seed that batch. When mirroring is enabled and succeeds, a fresh
 * match therefore has a head before its first player command. A legacy
 * log without journal history does not gain a head merely by being read.
 *
 * This consult reads persisted state, not the process mode. Changing the
 * mode does not change whether a stored effective head exists.
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
 * right now.
 *
 * This union describes the read result; it does not select a recovery
 * reader or install missing history. Callers own those decisions.
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
