/**
 * Aggregate Batch Outcomes - pure stats reducer for Quick Resolve.
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

type SuccessfulOutcome = {
  report: IPostBattleReport;
};

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

function sideByUnitFromReport(
  report: IPostBattleReport,
): Map<string, GameSide> {
  const sideByUnit = new Map<string, GameSide>();
  for (const unit of report.units) {
    sideByUnit.set(unit.unitId, unit.side);
  }
  return sideByUnit;
}

function reportHadShutdown(report: IPostBattleReport, side: GameSide): boolean {
  const sideByUnit = sideByUnitFromReport(report);
  for (const event of report.log) {
    if (event.type !== GameEventType.ShutdownCheck) continue;
    const payload = (event as IGameEvent).payload as IShutdownCheckPayload;
    if (payload.shutdownOccurred && sideByUnit.get(payload.unitId) === side) {
      return true;
    }
  }
  return false;
}

function reportHadDestroyed(
  report: IPostBattleReport,
  side: GameSide,
): boolean {
  const sideByUnit = sideByUnitFromReport(report);
  for (const event of report.log) {
    if (event.type !== GameEventType.UnitDestroyed) continue;
    const unitId = (event.payload as { unitId: string }).unitId;
    if (sideByUnit.get(unitId) === side) return true;
  }
  return false;
}

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

function resolveBaseSeed(
  outcomes: readonly IBatchOutcome[],
  baseSeed?: number,
): number {
  return (
    baseSeed ??
    (outcomes.length > 0 ? outcomes[0]!.seed - outcomes[0]!.runIndex : 0)
  );
}

function partitionOutcomes(outcomes: readonly IBatchOutcome[]): {
  successful: SuccessfulOutcome[];
  erroredRuns: number;
} {
  const successful: SuccessfulOutcome[] = [];
  let erroredRuns = 0;

  for (const outcome of outcomes) {
    if (outcome.report) {
      successful.push({ report: outcome.report });
    } else {
      erroredRuns++;
    }
  }

  return { successful, erroredRuns };
}

function winProbabilityFromReports(
  successful: readonly SuccessfulOutcome[],
): IBatchWinProbability {
  let playerWins = 0;
  let opponentWins = 0;
  let draws = 0;

  for (const { report } of successful) {
    if (report.winner === GameSide.Player) {
      playerWins++;
    } else if (report.winner === GameSide.Opponent) {
      opponentWins++;
    } else {
      draws++;
    }
  }

  const denom = successful.length;
  return {
    player: playerWins / denom,
    opponent: opponentWins / denom,
    draw: draws / denom,
  };
}

function mostLikelyOutcomeFrom(
  winProbability: IBatchWinProbability,
): GameSide | 'draw' {
  if (winProbability.player > winProbability.opponent) {
    return GameSide.Player;
  }

  if (winProbability.opponent > winProbability.player) {
    return GameSide.Opponent;
  }

  return 'draw';
}

function turnCountFromReports(
  successful: readonly SuccessfulOutcome[],
): IBatchTurnCount {
  const turnCounts = successful
    .map(({ report }) => report.turnCount)
    .slice()
    .sort((a, b) => a - b);
  const sum = turnCounts.reduce((acc, turnCount) => acc + turnCount, 0);

  return {
    mean: sum / turnCounts.length,
    median: percentile(turnCounts, 50),
    p25: percentile(turnCounts, 25),
    p75: percentile(turnCounts, 75),
    p90: percentile(turnCounts, 90),
    min: turnCounts[0]!,
    max: turnCounts[turnCounts.length - 1]!,
  };
}

function sideFrequencyFromReports(
  successful: readonly SuccessfulOutcome[],
  predicate: (report: IPostBattleReport, side: GameSide) => boolean,
): IBatchSideFrequency {
  let playerMatches = 0;
  let opponentMatches = 0;

  for (const { report } of successful) {
    if (predicate(report, GameSide.Player)) playerMatches++;
    if (predicate(report, GameSide.Opponent)) opponentMatches++;
  }

  const denom = successful.length;
  return {
    player: playerMatches / denom,
    opponent: opponentMatches / denom,
  };
}

function perUnitSurvivalFromReports(
  successful: readonly SuccessfulOutcome[],
): Record<string, number> {
  const survivalCounts = new Map<string, number>();

  for (const { report } of successful) {
    const destroyed = destroyedUnitsFromReport(report);
    for (const unit of report.units) {
      if (!destroyed.has(unit.unitId)) {
        survivalCounts.set(
          unit.unitId,
          (survivalCounts.get(unit.unitId) ?? 0) + 1,
        );
      } else if (!survivalCounts.has(unit.unitId)) {
        survivalCounts.set(unit.unitId, 0);
      }
    }
  }

  const denom = successful.length;
  const perUnitSurvival: Record<string, number> = {};
  survivalCounts.forEach((count, unitId) => {
    perUnitSurvival[unitId] = count / denom;
  });

  return perUnitSurvival;
}

export function aggregateBatchOutcomes(
  outcomes: readonly IBatchOutcome[],
  baseSeed?: number,
): IBatchResult {
  const resolvedBaseSeed = resolveBaseSeed(outcomes, baseSeed);

  if (outcomes.length === 0) {
    return emptyResult(resolvedBaseSeed);
  }

  const { successful, erroredRuns } = partitionOutcomes(outcomes);

  if (successful.length === 0) {
    return {
      ...emptyResult(resolvedBaseSeed),
      totalRuns: outcomes.length,
      erroredRuns,
    };
  }

  const winProbability = winProbabilityFromReports(successful);

  return {
    totalRuns: outcomes.length,
    erroredRuns,
    baseSeed: resolvedBaseSeed,
    winProbability,
    turnCount: turnCountFromReports(successful),
    heatShutdownFrequency: sideFrequencyFromReports(
      successful,
      reportHadShutdown,
    ),
    mechDestroyedFrequency: sideFrequencyFromReports(
      successful,
      reportHadDestroyed,
    ),
    perUnitSurvival: perUnitSurvivalFromReports(successful),
    mostLikelyOutcome: mostLikelyOutcomeFrom(winProbability),
  };
}
