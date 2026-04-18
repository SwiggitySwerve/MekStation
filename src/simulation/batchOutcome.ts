/**
 * Batch Outcome & Result Types — Quick Resolve Monte Carlo
 *
 * Shapes consumed by:
 *   - `QuickResolveService.runBatch` (producer)
 *   - `aggregateBatchOutcomes` (reducer)
 *   - `useQuickResolve` hook + downstream UI (Sub-Branch B's
 *     `QuickSimResultPanel` etc.)
 *
 * @spec openspec/changes/add-quick-resolve-monte-carlo/specs/after-combat-report/spec.md
 */

import type { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

/**
 * Outcome of a single Monte Carlo run inside a batch.
 *
 * Either `report` or `error` is populated, never both. `durationMs`
 * captures how long that run took so callers can profile slow seeds.
 */
export interface IBatchOutcome {
  /** 0-based ordinal of this run within the batch. */
  readonly runIndex: number;
  /** Seed used for this specific run = `baseSeed + runIndex`. */
  readonly seed: number;
  /** Wall-clock duration in milliseconds. */
  readonly durationMs: number;
  /** Per-run post-battle report (omitted when the run errored). */
  readonly report?: IPostBattleReport;
  /** Error message captured if `runToCompletion` threw. */
  readonly error?: string;
}

/** Win-probability triple covering both sides plus draws. */
export interface IBatchWinProbability {
  readonly player: number;
  readonly opponent: number;
  readonly draw: number;
}

/** Frequency triple for side-keyed event occurrence rates. */
export interface IBatchSideFrequency {
  readonly player: number;
  readonly opponent: number;
}

/** Turn-count distribution stats over the batch. */
export interface IBatchTurnCount {
  readonly mean: number;
  readonly median: number;
  readonly p25: number;
  readonly p75: number;
  readonly p90: number;
  readonly min: number;
  readonly max: number;
}

/**
 * Aggregated statistical summary of an N-run Monte Carlo batch.
 *
 * `totalRuns` reflects the count actually completed (after partial
 * cancellation it is the partial count, not the requested count).
 * Probabilities are computed over `successfulRuns = totalRuns -
 * erroredRuns` so engine errors do not skew the distribution.
 */
export interface IBatchResult {
  /** Number of runs completed (success + error). */
  readonly totalRuns: number;
  /** Subset of `totalRuns` that errored before producing a report. */
  readonly erroredRuns: number;
  /** Base seed used; round-trips so callers can replay deterministically. */
  readonly baseSeed: number;
  readonly winProbability: IBatchWinProbability;
  readonly turnCount: IBatchTurnCount;
  readonly heatShutdownFrequency: IBatchSideFrequency;
  readonly mechDestroyedFrequency: IBatchSideFrequency;
  /** unitId → fraction of successful runs in which the unit survived. */
  readonly perUnitSurvival: Readonly<Record<string, number>>;
  /** Side with the highest win probability (ties resolve to "draw"). */
  readonly mostLikelyOutcome: GameSide | 'draw';
}
