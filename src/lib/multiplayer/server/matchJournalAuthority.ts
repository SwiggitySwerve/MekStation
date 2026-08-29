/**
 * Combat journal-authority types and consume-apply seam (task 2.3).
 * Flag OFF matches CAMPAIGN_JOURNAL_AUTHORITY_ENABLED.
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import type { IDecideCommandBatchDeps } from './ServerMatchHostDecision';

/** Hard-disabled cutover switch, same shape as the campaign sibling. */
export const COMBAT_JOURNAL_AUTHORITY_ENABLED = false;

/** Complete head tuple recorded with the one-time started fact (D4). */
export interface IMatchJournalAuthorityHead {
  readonly streamType: 'match';
  readonly streamId: string;
  readonly branchId: string;
  readonly revision: number;
  readonly digest: string;
  readonly effectiveGeneration: number;
}

/**
 * Immutable one-time `journal-authority-started` fact. Written inside
 * the first journal-authority batch transaction. There is no UPDATE
 * path; a second insert fails on the primary key.
 */
export interface IMatchJournalAuthorityStarted {
  readonly matchId: string;
  readonly commandId: string;
  readonly firstRevision: number;
  readonly lastRevision: number;
  readonly head: IMatchJournalAuthorityHead;
  readonly committedAt: string;
}

/** Fold the committed envelope. Does not re-dispatch the intent (L1). */
export function foldCommittedEvents(
  live: InteractiveSession,
  committed: readonly IGameEvent[],
  deps: IDecideCommandBatchDeps,
): InteractiveSession {
  const current = live.getSession();
  const hydrated = hydrateGameSessionFromEvents(current.id, [
    ...current.events,
    ...committed,
  ]);
  return InteractiveSession.fromHydratedSession(hydrated, {
    random: new SeededRandom(deps.randomSeed),
    playerUnits: deps.playerUnits,
    opponentUnits: deps.opponentUnits,
  });
}

type ApplyCommitted = typeof foldCommittedEvents;
let applyCommittedHook: ApplyCommitted | null = null;

/** Host apply entry. Tests may replace this without touching derive. */
export function applyCommittedEvents(
  live: InteractiveSession,
  committed: readonly IGameEvent[],
  deps: IDecideCommandBatchDeps,
): InteractiveSession {
  return (applyCommittedHook ?? foldCommittedEvents)(live, committed, deps);
}

/** Test-only: corrupt or replace the APPLY pass without touching derive. */
export function _setApplyCommittedForTests(fn: ApplyCommitted | null): void {
  applyCommittedHook = fn;
}

/** Compare applied vs committed expected digest. Isolated for falsification. */
export function verifyAppliedDigest(
  appliedDigest: string,
  expectedDigest: string,
): boolean {
  return appliedDigest === expectedDigest;
}
