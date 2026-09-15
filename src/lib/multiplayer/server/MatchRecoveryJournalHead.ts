/**
 * S4 of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.4): the
 * ORDINARY restart-recovery path's journal-head consult.
 *
 * Before this seam `recoverActiveMatches` had two paths — a rewound
 * stream (`tryFoldActivatedRewindBranch`) and everything else, rebuilt
 * from `mp_match_events` with no journal read at all. design.md's S4
 * says that second path must stop being "the legacy event table alone",
 * and this module is the consult that ends it.
 *
 * WHAT THE JOURNAL DECIDES HERE. Whether the stream is journal-started
 * (the derived head — S3's single source of "started", never the
 * retired `mp_journal_authority_started` marker), which branch identity
 * it answers on, and the revision the rebuild stops at.
 *
 * WHAT IT DELIBERATELY DOES NOT DECIDE: the event bytes. This is a
 * HEAD-AND-BRANCH read, and that restriction is load-bearing twice
 * over. A live-path branch's events live in the match store —
 * `matchStoreBranchSegmentReader` refuses every branch but `root` by
 * name because that store holds exactly one line of history. And the
 * journal TAIL cannot be complete for a real match anyway:
 * `ServerMatchHost.create` persists a match's opening events through
 * `appendEvent`, which is not the batch boundary S1's mirror hooks, so
 * the first command batch lands on a journal that is already behind and
 * mirrors `revision-conflict`. Seeding the mirror at creation is what
 * closes that, and it is owed by task 1.7 (S6) — shadow parity is the
 * promise it falsifies (`r4-s2-live-head-admission-review-20260915`,
 * `4_createPathFinding`). S4 is correct without the seed because a
 * stream with no head is exactly the legacy path, unchanged.
 *
 * DISAGREEMENT IS A REFUSAL, NEVER A PREFERENCE. A head that exists
 * while the match log runs past it (or short of it) is S1's disclosed
 * no-catch-up, reachable under ordinary load through RR-1's missing
 * `busy_timeout`. Serving either side would be a guess about which
 * history happened, so recovery refuses `partial-history` — the same
 * word `checkpointRecoveryPort` uses for a trusted base handed a tail
 * that does not continue it — and the match serves nothing. It is NOT
 * quarantined: a mirror that fell behind is a desynchronized copy, not
 * authority data that is wrong, and `quarantineAuthorityCorruption`
 * draws that same line.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S4)
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type { IMatchStore } from './IMatchStore';

import { matchStreamRef } from './history/GmCombatRewindPreview';
import { revisionForMatchSequence } from './history/matchStoreBranchSegmentReader';
import { isLivePathBranchId } from './matchAuthorityBaseline';
import { deriveMatchJournalAuthorityStartedHead } from './matchJournalAuthorityStartedDerived';

export type MatchRecoveryJournalConsult =
  /** No journal head answers for this stream: rebuild as before. */
  | { readonly kind: 'legacy' }
  /** The head answers, and these are the events it bounds. */
  | {
      readonly kind: 'journal';
      readonly branchId: string;
      readonly headRevision: number;
      readonly events: readonly IGameEvent[];
    }
  /** The head and the match log disagree about where history ends. */
  | { readonly kind: 'diverged'; readonly evidence: readonly string[] };

/**
 * Ask the journal head what this match's live history is.
 *
 * `unavailable` (the port exists but its database is not open) answers
 * `legacy`, and that is the SAME answer `tryFoldActivatedRewindBranch`
 * already gives in that state — production builds the store with no
 * capability database, so refusing here would block recovery for every
 * ordinary match in a process that never opened the campaign file.
 * Recovery must not hold two different opinions about whether the
 * journal can speak.
 *
 * A head naming a branch OFF the live path is a rewound stream, which
 * the fold ahead of this consult owns; it cannot reach here, and
 * answering `legacy` for it is the same fall-through that already
 * applies when the journal cannot be read at all.
 */
export async function consultMatchRecoveryJournalHead(
  store: IMatchStore,
  matchId: string,
): Promise<MatchRecoveryJournalConsult> {
  if (deriveMatchJournalAuthorityStartedHead(store, matchId).kind !== 'started')
    return { kind: 'legacy' };
  const sqlite = getSQLiteService();
  if (!sqlite.isInitialized()) return { kind: 'legacy' };
  const db = sqlite.getDatabase();
  const stream = matchStreamRef(matchId);
  const head = readEffectiveStreamHead(
    db,
    new SQLiteEventHistoryBranchStore(db),
    stream,
  );
  if (!isLivePathBranchId(head.branchId)) return { kind: 'legacy' };

  const events = await store.getEvents(matchId, 0);
  const last = events[events.length - 1];
  const logRevision =
    last === undefined ? 0 : revisionForMatchSequence(last.sequence);
  // Both, not either: the revision says where the log ENDS and the count
  // says how much of it survived, and a mirror can fall behind on one
  // without the other when a tail is superseded.
  if (logRevision !== head.revision || events.length !== head.revision) {
    return {
      kind: 'diverged',
      evidence: [
        `journal head '${head.branchId}' at revision ${head.revision}; ` +
          `match log holds ${events.length} events through revision ${logRevision}`,
      ],
    };
  }
  return {
    kind: 'journal',
    branchId: head.branchId,
    headRevision: head.revision,
    // The head is the ceiling, stated rather than assumed. The check
    // above makes it exact today; writing the bound here is what keeps
    // "rebuilt from the journal head" true if that check ever loosens.
    events: events.filter(
      (event) => revisionForMatchSequence(event.sequence) <= head.revision,
    ),
  };
}
