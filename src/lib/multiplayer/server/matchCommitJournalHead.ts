/**
 * S5-b of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.6): the
 * WRITE-side journal-head consult, sibling of S4's
 * `MatchRecoveryJournalHead`.
 *
 * S4 asks the head what a restarting host must REBUILD. This asks it
 * what a committed batch must be appended AT: the same effective-head
 * read, in the opposite direction.
 *
 * WHERE THE NUMBER CAME FROM UNTIL NOW. `DurableMatchStore`'s
 * commit-time check reads `MAX(sequence)` over `mp_match_events`; S5
 * named that step (`nextMatchSequenceAfter`) and named the translation
 * to a journal revision (`journalHeadRevisionForNextMatchSequence`),
 * but the VALUE still originated in the legacy log. design.md's S5 says
 * the expected revision comes from the journal head, and this module is
 * where it starts doing so.
 *
 * WHY IT IS A SEPARATE READ FROM THE APPEND. The append re-reads the
 * head inside its own transaction, and a consult that ran there too
 * could never disagree with it — the optimistic check would compare a
 * value against itself and no commit could ever conflict. This read is
 * deliberately OUTSIDE that transaction, so a writer holds a view
 * another writer can invalidate. That gap IS the expected-head race,
 * and the append's typed `revision-conflict` is what closes it.
 *
 * WHAT IT DOES NOT DECIDE: the branch. That is read inside the append's
 * own transaction, so an activation committing between the consult and
 * the append cannot be written past — the new branch's head sits at its
 * base revision, the consulted number does not, and the append refuses.
 * Carrying a branch id out of here would hand the writer a way to append
 * onto a superseded branch.
 *
 * MODE-GATED, AND THE GATE IS THE WHOLE POINT. Only `enabled` says the
 * journal head is the authority for this stream; `off` (the production
 * const) and `shadow` keep the store-derived answer, byte for byte.
 * Nothing here flips a cutover.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S5)
 */

import type Database from 'better-sqlite3';

import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';

import { matchStreamRef } from './history/GmCombatRewindPreview';
import { journalHeadRevisionForNextMatchSequence } from './history/matchStoreBranchSegmentReader';
import { getCombatJournalAuthorityMode } from './matchJournalAuthority';

/**
 * The revision a committed batch declares, and where it came from.
 *
 * The `kind` is not decoration: `store` means the number was derived
 * from the match log's next sequence, which stops describing a journal
 * revision the moment a rewind supersedes a tail — so a stream off the
 * live path may not be mirrored on it. `journal` means the head itself
 * answered, which is true of a rewound stream as much as any other.
 */
export type MatchCommitExpectedRevision =
  | { readonly kind: 'store'; readonly expectedRevision: number }
  | { readonly kind: 'journal'; readonly expectedRevision: number };

/** The legacy answer: the match store's next sequence, translated. */
export function storeExpectedRevision(
  nextMatchSequence: number,
): MatchCommitExpectedRevision {
  return {
    kind: 'store',
    expectedRevision:
      journalHeadRevisionForNextMatchSequence(nextMatchSequence),
  };
}

/**
 * Resolve the revision a committed batch must be appended at.
 *
 * `nextMatchSequence` is required on both arms rather than only the
 * store one: at `off` and `shadow` it IS the answer, and a caller that
 * could not produce it has no business mirroring.
 */
export function resolveMatchCommitExpectedRevision(
  db: Database.Database,
  matchId: string,
  nextMatchSequence: number,
): MatchCommitExpectedRevision {
  if (getCombatJournalAuthorityMode() !== 'enabled') {
    return storeExpectedRevision(nextMatchSequence);
  }
  const head = readEffectiveStreamHead(
    db,
    new SQLiteEventHistoryBranchStore(db),
    matchStreamRef(matchId),
  );
  // The head's own revision, NOT a translation of the store's sequence:
  // on a rewound stream those two are the same number only while the
  // superseded tail and the candidate's base agree, and "only while"
  // is exactly the assumption S5 refused to keep making.
  return { kind: 'journal', expectedRevision: head.revision };
}
