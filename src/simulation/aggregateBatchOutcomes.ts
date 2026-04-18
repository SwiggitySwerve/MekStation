/**
 * Aggregate Batch Outcomes — pure stats reducer for Quick Resolve.
 *
 * Reduces an `IBatchOutcome[]` produced by `QuickResolveService.runBatch`
 * into a single `IBatchResult` summary used by the result-display UI.
 *
 * Determinism contract: this function is a pure function of its input.
 * For a given `outcomes` array (in the same order, with the same
 * payloads), the returned `IBatchResult` MUST be deeply equal across
 * invocations.
 *
 * @spec openspec/changes/add-quick-resolve-monte-carlo/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-quick-resolve-monte-carlo/specs/after-combat-report/spec.md
 */

import type {
  IGameEvent,
  IShutdownCheckPayload,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

import {
  GameEventType,
  GameSide,
} from '@/types/gameplay/GameSessionInterfaces';

import type {
  IBatchOutcome,
  IBatchResult,
  IBatchSideFrequency,
  IBatchTurnCount,
  IBatchWinProbability,
} from './batchOutcome';

// =============================================================================
// Empty result helpers (spec: empty input must not throw or NaN-out)
// =============================================================================

const EMPTY_TURN_COUNT: IBatchTurnCount = {
  mean: 0,
  median: 0,
  p25: 0,
  p75: 0,
  p90: 0,
  min: 0,
  max: 0,
};

const EMPTY_FREQUENCY: IBatchSideFrequency = { player: 0, opponent: 0 };
const EMPTY_PROBABILITY: IBatchWinProbability = {
  player: 0,
  opponent: 0,
  draw: 0,
};

/**
 * Build the canonical "no data" result. Used both for empty input and
 * for batches cancelled before any runs completed.
 */
function emptyResult(baseSeed: number): IBatchResult {
  return {
    totalRuns: 0,
    erroredRuns: 0,
    baseSeed,
    winProbability: EMPTY_PROBABILITY,
    turnCount: EMPTY_TURN_COUNT,
    heatShutdownFrequency: EMPTY_FREQUENCY,
    mechDestroyedFrequency: EMPTY_FREQUENCY,
    perUnitSurvival: {},
    mostLikelyOutcome: 'draw',
  };
}

// =============================================================================
// Percentile helper — nearest-rank method (R-2 / type 1)
// =============================================================================

/**
 * Linear interpolation percentile, matching the "type 7" definition
 * common in spreadsheets / numpy default. Sorted ascending input.
 *
 * Returns 0 for empty input rather than throwing — callers already
 * guard against empty `successful` outcomes via the empty-result path.
 */
function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo]!;
  const weight = rank - lo;
  return sorted[lo]! * (1 - weight) + sorted[hi]! * weight;
}

// =============================================================================
// Per-side helpers
// =============================================================================

/**
 * True iff at least one unit on `side` shut down due to heat at any
 * point during the match. We walk the full event log because the
 * post-battle report's `heatProblems` counter only counts heat>=14
 * events, not actual shutdown rolls.
 */
function reportHadShutdown(report: IPostBattleReport, side: GameSide): boolean {
  // Build a quick lookup of unit → side.
  const sideByUnit = new Map<string, GameSide>();
  for (const u of report.units) sideByUnit.set(u.unitId, u.side);

  for (const event of report.log) {
    if (event.type !== GameEventType.ShutdownCheck) continue;
    const payload = (event as IGameEvent).payload as IShutdownCheckPayload;
    if (!payload.shutdownOccurred) continue;
    if (sideByUnit.get(payload.unitId) === side) return true;
  }
  return false;
}

/**
 * True iff at least one unit on `side` ended the match destroyed.
 * Detected via `UnitDestroyed` events in the log so we count whichever
 * side had a casualty regardless of report-level metadata.
 */
function reportHadDestroyed(
  report: IPostBattleReport,
  side: GameSide,
): boolean {
  const sideByUnit = new Map<string, GameSide>();
  for (const u of report.units) sideByUnit.set(u.unitId, u.side);

  const destroyed = new Set<string>();
  for (const event of report.log) {
    if (event.type !== GameEventType.UnitDestroyed) continue;
    const unitId = (event.payload as { unitId: string }).unitId;
    destroyed.add(unitId);
  }
  let found = false;
  destroyed.forEach((unitId) => {
    if (!found && sideByUnit.get(unitId) === side) found = true;
  });
  return found;
}

/**
 * Survival check for `perUnitSurvival`. We rely on `UnitDestroyed`
 * events because `IUnitReport` does not expose a `destroyed` boolean
 * directly (kills count is on the killer, not the victim).
 */
function destroyedUnitsFromReport(
  report: IPostBattleReport,
): ReadonlySet<string> {
  const destroyed = new Set<string>();
  for (const event of report.log) {
    if (event.type === GameEventType.UnitDestroyed) {
      destroyed.add((event.payload as { unitId: string }).unitId);
    }
  }
  return destroyed;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Aggregate per-run outcomes into a Quick Resolve summary.
 *
 * @param outcomes per-run results from `QuickResolveService.runBatch`
 * @param baseSeed seed used for the batch — round-tripped onto the
 *   result so callers can replay; defaults to the first outcome's seed
 *   minus its index, or 0 when outcomes is empty.
 */
export function aggregateBatchOutcomes(
  outcomes: readonly IBatchOutcome[],
  baseSeed?: number,
): IBatchResult {
  // Resolve baseSeed: prefer caller-supplied; otherwise derive from
  // outcome[0] if present (seed = baseSeed + runIndex).
  const resolvedBaseSeed =
    baseSeed ??
    (outcomes.length > 0 ? outcomes[0]!.seed - outcomes[0]!.runIndex : 0);

  if (outcomes.length === 0) {
    return emptyResult(resolvedBaseSeed);
  }

  // Partition by error vs success.
  const successful: { outcome: IBatchOutcome; report: IPostBattleReport }[] =
    [];
  let erroredRuns = 0;
  for (const o of outcomes) {
    if (o.report) {
      successful.push({ outcome: o, report: o.report });
    } else {
      erroredRuns++;
    }
  }

  // If every run errored we cannot derive any probabilities — return
  // an empty result but preserve totalRuns + erroredRuns for the UI.
  if (successful.length === 0) {
    return {
      ...emptyResult(resolvedBaseSeed),
      totalRuns: outcomes.length,
      erroredRuns,
    };
  }

  // ---- Win probability -----------------------------------------------------
  let playerWins = 0;
  let opponentWins = 0;
  let draws = 0;
  for (const { report } of successful) {
    if (report.winner === GameSide.Player) playerWins++;
    else if (report.winner === GameSide.Opponent) opponentWins++;
    else draws++;
  }
  const denom = successful.length;
  const winProbability: IBatchWinProbability = {
    player: playerWins / denom,
    opponent: opponentWins / denom,
    draw: draws / denom,
  };

  // ---- Most likely outcome (ties between sides → draw) ---------------------
  let mostLikelyOutcome: GameSide | 'draw';
  if (winProbability.player > winProbability.opponent) {
    mostLikelyOutcome = GameSide.Player;
  } else if (winProbability.opponent > winProbability.player) {
    mostLikelyOutcome = GameSide.Opponent;
  } else {
    // Player == Opponent → draw, regardless of actual draw probability.
    mostLikelyOutcome = 'draw';
  }

  // ---- Turn count stats ----------------------------------------------------
  const turnCounts = successful
    .map(({ report }) => report.turnCount)
    .slice()
    .sort((a, b) => a - b);
  const sum = turnCounts.reduce((acc, t) => acc + t, 0);
  const turnCount: IBatchTurnCount = {
    mean: sum / turnCounts.length,
    median: percentile(turnCounts, 50),
    p25: percentile(turnCounts, 25),
    p75: percentile(turnCounts, 75),
    p90: percentile(turnCounts, 90),
    min: turnCounts[0]!,
    max: turnCounts[turnCounts.length - 1]!,
  };

  // ---- Heat shutdown frequency --------------------------------------------
  let playerShutdownMatches = 0;
  let opponentShutdownMatches = 0;
  for (const { report } of successful) {
    if (reportHadShutdown(report, GameSide.Player)) playerShutdownMatches++;
    if (reportHadShutdown(report, GameSide.Opponent)) opponentShutdownMatches++;
  }
  const heatShutdownFrequency: IBatchSideFrequency = {
    player: playerShutdownMatches / denom,
    opponent: opponentShutdownMatches / denom,
  };

  // ---- Mech destroyed frequency -------------------------------------------
  let playerDestroyedMatches = 0;
  let opponentDestroyedMatches = 0;
  for (const { report } of successful) {
    if (reportHadDestroyed(report, GameSide.Player)) playerDestroyedMatches++;
    if (reportHadDestroyed(report, GameSide.Opponent)) {
      opponentDestroyedMatches++;
    }
  }
  const mechDestroyedFrequency: IBatchSideFrequency = {
    player: playerDestroyedMatches / denom,
    opponent: opponentDestroyedMatches / denom,
  };

  // ---- Per-unit survival --------------------------------------------------
  // Initialize counters from the union of all unit ids across reports
  // so the UI can render rows even for units that errored out of some
  // runs. A unit "survives" a run iff it appears in `report.units` AND
  // is NOT in the destroyed set for that run.
  const survivalCounts = new Map<string, number>();
  const presenceCounts = new Map<string, number>();
  for (const { report } of successful) {
    const destroyed = destroyedUnitsFromReport(report);
    for (const u of report.units) {
      presenceCounts.set(u.unitId, (presenceCounts.get(u.unitId) ?? 0) + 1);
      if (!destroyed.has(u.unitId)) {
        survivalCounts.set(u.unitId, (survivalCounts.get(u.unitId) ?? 0) + 1);
      } else if (!survivalCounts.has(u.unitId)) {
        // Ensure unit appears in the result map even if it never survived.
        survivalCounts.set(u.unitId, 0);
      }
    }
  }
  const perUnitSurvival: Record<string, number> = {};
  survivalCounts.forEach((count, unitId) => {
    // Normalize over successful runs (denom) per spec — a unit absent
    // from a given run still counts that run against its survival rate.
    perUnitSurvival[unitId] = count / denom;
  });

  return {
    totalRuns: outcomes.length,
    erroredRuns,
    baseSeed: resolvedBaseSeed,
    winProbability,
    turnCount,
    heatShutdownFrequency,
    mechDestroyedFrequency,
    perUnitSurvival,
    mostLikelyOutcome,
  };
}
