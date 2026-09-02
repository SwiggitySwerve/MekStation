/**
 * The authority recovery port (umbrella task 15.3).
 *
 * Every authority in this codebase rebuilds state the same way - read the
 * whole log, fold it - and each one does it at its own call site, with its
 * own idea of what a failure means. `CampaignEventLog.reconstructState`
 * folds and returns; `MatchRecovery` folds inside a try/catch and pushes
 * the id onto a `failed` array with a `console.warn`. Neither can say
 * "this authority is not recoverable, and here is why", and neither can
 * resume from a checkpoint even though the cache to do it now exists.
 *
 * This is the one seam both go through. It answers with a VERDICT:
 *
 * - `recovered` - the state, and which path produced it. Both paths end
 *   at the same state; `appliedRevisions` is the only difference, and
 *   that difference is the entire benefit of a checkpoint.
 * - `blocked` - a typed reason and evidence, and NOTHING ELSE. There is
 *   no state field to read, no digest, no "partial" anything: the
 *   variant simply does not carry one, so a caller cannot publish a
 *   half-rebuilt authority even by mistake.
 *
 * `referenceRecoveryPort` is the DEFAULT and is deliberately inert: read
 * everything, fold it, report `full-replay`. Adopting it at a call site
 * that used to do exactly that changes nothing observable, which is what
 * makes the adoption safe to land before any authority has a checkpoint
 * producer wired.
 *
 * `checkpointRecoveryPort` adds acceleration, and adds it WITHOUT a second
 * copy of the trust rules. It asks `BranchCheckpointCache.offer` (which
 * admits a row only through `selectRecoveryBase`, so the digest law and
 * the live-chain-digest binding both hold) and it checks the tail with the
 * shipped `evaluateReplayTailContinuity`. A row the live history cannot
 * attest is not an error - the offer simply is not made, an EARLIER
 * trusted base is offered instead, and failing that the reference path
 * runs. Only one thing blocks: a base that WAS admitted followed by a tail
 * that does not continue it. Folding that would project a history with a
 * hole in it.
 *
 * Two doors, one law: `ReplayEquivalenceHarness.recoverState` remains the
 * door for pipelines bound to a `ReplayProjector`, and this port is the
 * door for authorities whose reducer is not one yet - the campaign folds
 * with `applyCampaignEvent`, and no production projector binding exists
 * (`ReplayProjectorRegistry` says so in its own header). Both doors go
 * through the same two shipped kernels; a projector binding for the
 * campaign vocabulary is what would collapse them into one, and that
 * belongs to the campaign-journal work, not here. Concretely, the two
 * doors collapse when the campaign-journal cutover (task 5.7) registers a
 * `ReplayProjector` carrying the campaign authority's projector identity
 * and whose every decision applies `applyCampaignEvent` - at that point
 * this port's campaign binding is replaced by
 * `BranchCheckpointCache.recover`, and the fold seam below becomes dead
 * weight rather than a second path.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import { evaluateReplayTailContinuity } from '../replay/ReplayCheckpointCompatibility';
import { BranchCheckpointCache } from './BranchCheckpointCache';

export type {
  IBranchCheckpointPipeline,
  IBranchHistoryReader,
} from './BranchCheckpointCache';
export { BranchCheckpointCache } from './BranchCheckpointCache';

import type {
  IBranchCheckpointPipeline,
  IBranchHistoryReader,
} from './BranchCheckpointCache';

/**
 * The exclusive lower bound that means "from the beginning". Below every
 * authority's first revision, so `read` needs no inclusive variant and no
 * call site needs a zero special case.
 */
export const AUTHORITY_HISTORY_START = -1;

export type AuthorityRecoveryBlockedReason =
  /** An authority that must hold events holds none. */
  | 'empty-history'
  /** A trusted base, then a tail that does not continue it. */
  | 'partial-history'
  /** The reference fold itself threw. */
  | 'replay-failed';

export type AuthorityRecoveryVerdict<TState> =
  | {
      readonly kind: 'recovered';
      readonly path: 'checkpoint-plus-tail' | 'full-replay';
      readonly state: TState;
      readonly appliedRevisions: number;
    }
  | {
      readonly kind: 'blocked';
      readonly reason: AuthorityRecoveryBlockedReason;
      readonly evidence: readonly string[];
    };

/**
 * Thrown by a call site whose contract is a state rather than a verdict.
 *
 * It carries the verdict rather than flattening it to a string, so a
 * caller that wants to branch on the reason can, and a caller that just
 * lets it propagate still refuses truthfully.
 */
export class AuthorityRecoveryBlockedError extends Error {
  public readonly name = 'AuthorityRecoveryBlockedError';
  public constructor(
    public readonly verdict: Extract<
      AuthorityRecoveryVerdict<never>,
      { kind: 'blocked' }
    >,
  ) {
    super(
      `Authority recovery blocked (${verdict.reason}): ${verdict.evidence.join('; ')}`,
    );
  }
}

/** What the port needs from one authority to rebuild it. */
export interface IAuthorityRecoverySource<TEvent, TState> {
  readonly authorityId: string;
  /**
   * What an empty history MEANS here. A fresh campaign legitimately has
   * no events and folds to the empty state; an ACTIVE match with none is
   * malformed. Stated per call site rather than defaulted, because a
   * default would silently change one of them.
   */
  readonly emptyHistory: 'empty-state' | 'corrupt';
  /**
   * Ascending events with revision STRICTLY GREATER than
   * `fromExclusive`. `AUTHORITY_HISTORY_START` reads the whole log -
   * exclusive rather than inclusive because a checkpoint names the last
   * revision it COVERS, and because an authority whose first revision is
   * 0 (the campaign log's genesis) would otherwise lose it.
   */
  read(fromExclusive: number): Promise<readonly TEvent[]>;
  /** This authority's revision for one event. */
  revisionOf(event: TEvent): number;
  /** The ONE reducer. `base` absent means fold from the beginning. */
  fold(events: readonly TEvent[], base?: TState): TState;
}

export type AuthorityRecoveryPort<TEvent, TState> = (
  source: IAuthorityRecoverySource<TEvent, TState>,
) => Promise<AuthorityRecoveryVerdict<TState>>;

/** What acceleration needs on top of the source. */
export interface IAuthorityRecoveryCacheBinding<TState> {
  readonly cache: BranchCheckpointCache;
  readonly pipeline: IBranchCheckpointPipeline;
  /** The authority head being rebuilt to. */
  readonly headRevision: number;
  readonly history: IBranchHistoryReader;
  /** The cached bytes, back into this authority's state. */
  parse(stateJson: string): TState;
}

function blocked<TState>(
  reason: AuthorityRecoveryBlockedReason,
  evidence: readonly string[],
): AuthorityRecoveryVerdict<TState> {
  return Object.freeze({
    kind: 'blocked' as const,
    reason,
    evidence: Object.freeze([...evidence]),
  });
}

/**
 * The reference path, and the default everywhere.
 *
 * Read from the beginning, fold, report. This is a restatement of what
 * every adopting call site already did, which is the point: swapping it in
 * is provably a no-op, so the port can land before any authority produces
 * a checkpoint.
 */
export function referenceRecoveryPort<TEvent, TState>(): AuthorityRecoveryPort<
  TEvent,
  TState
> {
  return async (source) => {
    const events = await source.read(AUTHORITY_HISTORY_START);
    if (events.length === 0 && source.emptyHistory === 'corrupt') {
      return blocked('empty-history', [source.authorityId]);
    }
    try {
      return Object.freeze({
        kind: 'recovered' as const,
        path: 'full-replay' as const,
        state: source.fold(events),
        appliedRevisions: events.length,
      });
    } catch (error) {
      return blocked('replay-failed', [
        error instanceof Error ? error.message : String(error),
      ]);
    }
  };
}

/**
 * The accelerated path: resume from a cached prefix when one stands up.
 *
 * The offer decides admission (digest law, live chain digest, earlier
 * base); this only decides what to do with it. When there is no offer the
 * reference port runs - the SAME function, not a second copy of it - so
 * an authority with an empty, stale or corrupt cache behaves exactly as
 * an authority with no cache at all.
 */
export function checkpointRecoveryPort<TEvent, TState>(
  binding: IAuthorityRecoveryCacheBinding<TState>,
): AuthorityRecoveryPort<TEvent, TState> {
  const reference = referenceRecoveryPort<TEvent, TState>();
  return async (source) => {
    const offer = await binding.cache.offer(
      binding.pipeline,
      binding.headRevision,
      binding.history,
    );
    if (offer === null) return reference(source);

    const baseRevision = offer.metadata.revision;
    const tail = await source.read(baseRevision);
    const continuity = evaluateReplayTailContinuity(
      baseRevision,
      tail.map((event) => source.revisionOf(event)),
    );
    // A base that was ADMITTED and then handed a tail with a hole in it
    // is the one thing that must stop everything: folding it would
    // produce a state for a history that never happened. No fallback -
    // the reference path would hide a journal that is missing events.
    if (!continuity.contiguous) {
      return blocked('partial-history', [
        `revision ${continuity.expectedRevision} expected, found ${continuity.foundRevision}`,
      ]);
    }
    try {
      return Object.freeze({
        kind: 'recovered' as const,
        path: 'checkpoint-plus-tail' as const,
        state: source.fold(tail, binding.parse(offer.stateJson)),
        appliedRevisions: tail.length,
      });
    } catch (error) {
      return blocked('replay-failed', [
        error instanceof Error ? error.message : String(error),
      ]);
    }
  };
}
