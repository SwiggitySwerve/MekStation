/**
 * Swarm Aggregation — Phase 6 Per-Chassis / Per-Pilot Rollups.
 *
 * Public entry point: `aggregateSwarmBatch(results)` consumes a batch of
 * `ISimulationRunResult` and produces an `IAggregatedSwarmReport`. The
 * heavy-lifting accumulator helpers live in `./swarmAggregation.internals.ts`,
 * the type surface in `./swarmAggregation.types.ts` — keeping each file under
 * the 400-line max-lines lint cap and giving callers a small, focused import.
 *
 * Schema-version gate (per spec §"Schema-Version-Gated Rollups"):
 *   - Base rollups (damageMatrix, killCredits, unitPerformance) — produced
 *     from ALL inputs regardless of schemaVersion.
 *   - New rollups (chassisMatrix, gunneryBracket, aiVariantHeadToHead,
 *     pilotPerformance) — produced only from `schemaVersion >= 2` inputs.
 *     When the entire batch is v1, `aggregations` is omitted.
 */

import type { ISimulationRunResult } from '../runner/types';
import type {
  ChassisMatrix,
  GunneryBracket,
  IAIVariantMatchupRecord,
  IAggregatedSwarmReport,
  IBaseRollups,
  IChassisMatchupRecord,
  IGunneryBracketRecord,
  IPilotPerformanceRecord,
  ISchemaV2Rollups,
  IUnitPerformanceRecord,
} from './swarmAggregation.types';

import {
  accumulateAIVariantHeadToHead,
  accumulateBaseRollups,
  accumulateChassisMatrix,
  accumulateGunneryBracket,
  accumulatePilotPerformance,
  initGunneryBrackets,
  type MutableAIVariantAcc,
  type MutableChassisMatchup,
  type MutableGunneryBracketAcc,
  type MutablePilotAcc,
  type MutableUnitPerformanceAcc,
} from './swarmAggregation.internals';

// Re-export the type surface so consumers that only need shapes can import
// from `./swarmAggregation` directly without reaching into `.types.ts`.
export type {
  ChassisMatrix,
  DamageMatrix,
  GunneryBracket,
  IAIVariantMatchupRecord,
  IAggregatedSwarmReport,
  IBaseRollups,
  IChassisMatchupRecord,
  IGunneryBracketRecord,
  IPilotPerformanceRecord,
  ISchemaV2Rollups,
  IUnitPerformanceRecord,
  KillCredits,
} from './swarmAggregation.types';

// =============================================================================
// Main entry point — aggregateSwarmBatch (Task 6.1)
// =============================================================================

/**
 * Aggregate a batch of simulation run results into structured rollups.
 *
 * @param results - The full batch of simulation run results (may mix schemaVersions).
 * @returns IAggregatedSwarmReport with base rollups always present and
 *          aggregations present only when at least one input had schemaVersion >= 2.
 */
export function aggregateSwarmBatch(
  results: readonly ISimulationRunResult[],
): IAggregatedSwarmReport {
  // Accumulators — base (all inputs)
  const damageMatrix: Record<string, Record<string, number>> = {};
  const killCredits: Record<string, number> = {};
  const unitPerformance: Record<string, MutableUnitPerformanceAcc> = {};

  // Accumulators — schema-v2
  const chassisMatrixAcc: Record<
    string,
    Record<string, MutableChassisMatchup>
  > = {};
  const gunneryBracketAcc = initGunneryBrackets();
  const h2hAcc: Record<string, MutableAIVariantAcc> = {};
  const pilotAcc: Record<string, MutablePilotAcc> = {};
  const mixedVariantCount = { value: 0 };

  let schemaVersion2RunCount = 0;

  for (const result of results) {
    accumulateBaseRollups(result, damageMatrix, killCredits, unitPerformance);

    const isV2 =
      result.schemaVersion !== undefined &&
      result.schemaVersion >= 2 &&
      result.participants !== undefined &&
      result.participants.length > 0;

    if (isV2) {
      schemaVersion2RunCount++;
      const participants = result.participants!;

      accumulateChassisMatrix(participants, result.winner, chassisMatrixAcc);
      accumulateGunneryBracket(participants, result, gunneryBracketAcc);
      accumulateAIVariantHeadToHead(
        participants,
        result,
        h2hAcc,
        mixedVariantCount,
      );
      accumulatePilotPerformance(participants, result, pilotAcc);
    }
  }

  const baseRollups: IBaseRollups = freezeBaseRollups(
    damageMatrix,
    killCredits,
    unitPerformance,
  );

  if (schemaVersion2RunCount === 0) {
    return {
      totalRuns: results.length,
      schemaVersion2RunCount: 0,
      baseRollups,
    };
  }

  const aggregations: ISchemaV2Rollups = {
    chassisMatrix: freezeChassisMatrix(chassisMatrixAcc),
    gunneryBracket: freezeGunneryBracket(gunneryBracketAcc),
    aiVariantHeadToHead: freezeH2H(h2hAcc),
    pilotPerformance: freezePilots(pilotAcc),
    mixedVariantRuns: mixedVariantCount.value,
  };

  return {
    totalRuns: results.length,
    schemaVersion2RunCount,
    baseRollups,
    aggregations,
  };
}

// =============================================================================
// Freeze helpers — convert mutable accumulators into frozen, typed records
// =============================================================================

function freezeBaseRollups(
  damageMatrix: Record<string, Record<string, number>>,
  killCredits: Record<string, number>,
  unitPerformance: Record<string, MutableUnitPerformanceAcc>,
): IBaseRollups {
  return {
    damageMatrix,
    killCredits,
    unitPerformance: Object.fromEntries(
      Object.entries(unitPerformance).map(([id, acc]) => [
        id,
        {
          wins: acc.wins,
          losses: acc.losses,
          draws: acc.draws,
          totalDamageDealt: acc.totalDamageDealt,
        } satisfies IUnitPerformanceRecord,
      ]),
    ),
  };
}

function freezeChassisMatrix(
  acc: Record<string, Record<string, MutableChassisMatchup>>,
): ChassisMatrix {
  return Object.fromEntries(
    Object.entries(acc).map(([ca, row]) => [
      ca,
      Object.fromEntries(
        Object.entries(row).map(([cb, cell]) => [
          cb,
          {
            wins: cell.wins,
            losses: cell.losses,
            draws: cell.draws,
          } satisfies IChassisMatchupRecord,
        ]),
      ),
    ]),
  );
}

function freezeGunneryBracket(
  acc: Record<GunneryBracket, MutableGunneryBracketAcc>,
): Record<GunneryBracket, IGunneryBracketRecord> {
  const freeze = (a: MutableGunneryBracketAcc): IGunneryBracketRecord => ({
    wins: a.wins,
    losses: a.losses,
    draws: a.draws,
    avgDamageDealt:
      a.participantRunCount > 0 ? a.totalDamage / a.participantRunCount : 0,
  });
  return {
    '1-2': freeze(acc['1-2']),
    '3-4': freeze(acc['3-4']),
    '5-6': freeze(acc['5-6']),
    '7+': freeze(acc['7+']),
  };
}

function freezeH2H(
  acc: Record<string, MutableAIVariantAcc>,
): Record<string, IAIVariantMatchupRecord> {
  return Object.fromEntries(
    Object.entries(acc).map(([key, a]) => [
      key,
      {
        wins: a.wins,
        losses: a.losses,
        draws: a.draws,
        avgTurns: a.runCount > 0 ? a.totalTurns / a.runCount : 0,
      } satisfies IAIVariantMatchupRecord,
    ]),
  );
}

function freezePilots(
  acc: Record<string, MutablePilotAcc>,
): Record<string, IPilotPerformanceRecord> {
  return Object.fromEntries(
    Object.entries(acc).map(([pilotId, a]) => [
      pilotId,
      {
        runs: a.runs,
        wins: a.wins,
        kills: a.kills,
        takenWounds: a.takenWounds,
      } satisfies IPilotPerformanceRecord,
    ]),
  );
}

// =============================================================================
// CSV export (Task 6.7) — exposed but not CLI-wired
// =============================================================================

/**
 * Export the chassisMatrix as a flat CSV string.
 *
 * Column layout: `chassisA,chassisB,wins,losses,draws`
 *
 * Exposed for downstream consumers (e.g., a future `--output-format csv` flag
 * in Phase 5). NOT wired to any CLI flag here — per design D8, Phase 5 owns
 * CLI orchestration, Phase 6 owns analytics. Decoupling the export keeps both
 * phases independently testable.
 *
 * @param matrix - The chassisMatrix from `IAggregatedSwarmReport.aggregations`
 * @returns CSV string with header row and one data row per chassisA/chassisB pair
 */
export function exportChassisMatrixCsv(matrix: ChassisMatrix): string {
  const rows: string[] = ['chassisA,chassisB,wins,losses,draws'];
  const chassisAKeys = Object.keys(matrix).sort();
  for (const ca of chassisAKeys) {
    const row = matrix[ca]!;
    const chassisBKeys = Object.keys(row).sort();
    for (const cb of chassisBKeys) {
      const cell = row[cb]!;
      rows.push(`${ca},${cb},${cell.wins},${cell.losses},${cell.draws}`);
    }
  }
  return rows.join('\n');
}
