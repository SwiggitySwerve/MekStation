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

/** Process-wide cutover: off (legacy author), shadow (compare-only), enabled. */
export type CombatJournalAuthorityMode = 'off' | 'shadow' | 'enabled';

export const COMBAT_JOURNAL_AUTHORITY_MODE =
  'off' as CombatJournalAuthorityMode;

/** Derived so existing callers stay source-compatible. */
export const COMBAT_JOURNAL_AUTHORITY_ENABLED =
  COMBAT_JOURNAL_AUTHORITY_MODE === 'enabled';

let combatJournalAuthorityModeOverride: CombatJournalAuthorityMode | null =
  null;

/** Runtime mode, including the test override. Production reads the const. */
export function getCombatJournalAuthorityMode(): CombatJournalAuthorityMode {
  return combatJournalAuthorityModeOverride ?? COMBAT_JOURNAL_AUTHORITY_MODE;
}

/** Test-only: drive shadow/enabled construction without flipping the const. */
export function _setCombatJournalAuthorityModeForTests(
  mode: CombatJournalAuthorityMode | null,
): void {
  combatJournalAuthorityModeOverride = mode;
}

/** Last shadow compare, plus counters on the host. */
export interface ShadowComparisonRecord {
  readonly intentId: string | undefined;
  readonly equal: boolean;
  readonly eventCountLive: number;
  readonly eventCountShadow: number;
  readonly liveDigest: string;
  readonly shadowDigest: string;
  readonly audienceDigests?: readonly IShadowAudienceDigestComparison[];
  readonly reason?: string;
}

/** Equality evidence for one server-defined audience projection. */
export interface IShadowAudienceDigestComparison {
  readonly audience: string;
  readonly liveDigest: string;
  readonly shadowDigest: string;
  readonly equal: boolean;
}

/**
 * Process-wide shadow evidence for 4.2 admission. Zero comparisons is
 * not a blocker: equality evidence is the deployment act of flipping
 * the process mode to 'enabled'. This counter is the tripwire that
 * un-flips admission automatically if any shadow comparison in this
 * process recorded a mismatch.
 */
let processShadowComparisons = 0;
let processShadowMismatches = 0;

export function recordProcessShadowComparison(
  record: ShadowComparisonRecord,
): void {
  processShadowComparisons += 1;
  if (!record.equal) processShadowMismatches += 1;
}

export function getProcessShadowMismatchCount(): number {
  return processShadowMismatches;
}

export function getProcessShadowComparisonCount(): number {
  return processShadowComparisons;
}

/** Test-only: isolate admission tripwire state across suites. */
export function _resetProcessShadowStatsForTests(): void {
  processShadowComparisons = 0;
  processShadowMismatches = 0;
}

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
 * Immutable cutover baseline for a match admitted to journal authority.
 * Same tuple as the started-fact head; written once at admission.
 */
export type IMatchJournalAuthorityBaseline = IMatchJournalAuthorityHead;

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
