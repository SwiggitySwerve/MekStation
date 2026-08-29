/**
 * Combat journal-authority types and consume-apply seam (task 2.3).
 * Flag OFF matches CAMPAIGN_JOURNAL_AUTHORITY_ENABLED.
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import type { IDecideCommandBatchDeps } from './ServerMatchHostDecision';

/** Hard-disabled cutover switch, same shape as the campaign sibling. */
export const COMBAT_JOURNAL_AUTHORITY_ENABLED = false;

/**
 * Host-side recovery contract for the journal-authority path (task 2.4).
 * Wire translation stays 2.3's STORE_FAILURE / INTERNAL_ERROR frames;
 * 3.x and 4.x consume this union, not a new protocol enum.
 */
export type JournalAuthorityRecovery =
  | { readonly kind: 'persistence-failure'; readonly reason: string }
  | {
      readonly kind: 'revision-conflict';
      readonly expectedRevision: number;
      readonly actualRevision: number;
    }
  | {
      readonly kind: 'digest-divergence';
      readonly expectedDigest: string;
      readonly appliedDigest: string;
      readonly rebuilt: boolean;
    };

/** Path result: wire frames plus the host-side recovery arm, if any. */
export interface IJournalAuthorityPathResult {
  readonly messages: readonly IServerMessage[];
  readonly recovery: JournalAuthorityRecovery | null;
}

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

let skipNextPublish = false;

/** Test-only: die after commit (and apply) before the publish loop. */
export function _setSkipPublishForTests(skip: boolean): void {
  skipNextPublish = skip;
}

/** Test-only: read the skip flag. The setter is what clears it. */
export function _shouldSkipPublishForTests(): boolean {
  return skipNextPublish;
}
