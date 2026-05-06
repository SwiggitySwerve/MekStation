/**
 * Metrics type definitions for simulation analysis
 */

import { IViolation } from '../invariants/types';

/**
 * Per-game metrics collected from a single simulation run.
 *
 * Per `add-combat-fidelity-suite` Phase 5 (`combat-analytics` delta —
 * "MetricsCollector Hydrates From Event Log"): the combat-fidelity
 * counters (`criticalHitsLanded`, `componentDestroyedCount`,
 * `ammoExplosions`, `shutdowns`, `falls`, `pilotHits`) are derived from
 * the typed event log on each `ISimulationResult`. They are unconditional
 * counts — parsing an empty event log yields zeros for every field.
 *
 * Side resolution: events use the runner's `player-N` / `opponent-N`
 * unit-id prefix to attribute a unitId to a side. `playerUnitsStart` /
 * `opponentUnitsStart` count distinct unit ids per side that appear in
 * the event log; `playerUnitsEnd` / `opponentUnitsEnd` are the same set
 * minus any unit that received a `UnitDestroyed` event.
 */
export interface ISimulationMetrics {
  readonly seed: number;
  readonly timestamp: string;

  readonly winner: 'player' | 'opponent' | 'draw' | null;
  readonly turns: number;
  readonly durationMs: number;

  readonly violations: readonly IViolation[];

  readonly playerUnitsStart: number;
  readonly playerUnitsEnd: number;
  readonly opponentUnitsStart: number;
  readonly opponentUnitsEnd: number;
  readonly totalDamageDealt: {
    readonly player: number;
    readonly opponent: number;
  };

  /**
   * Phase 5 combat-fidelity counters — derived from the typed event log.
   * All counts are unconditional (zero when the corresponding event type
   * never fires in the run).
   */
  readonly criticalHitsLanded: number;
  readonly componentDestroyedCount: number;
  readonly ammoExplosions: number;
  readonly shutdowns: number;
  readonly falls: number;
  readonly pilotHits: number;
}

/**
 * Aggregate statistics computed from multiple simulation runs
 */
export interface IAggregateMetrics {
  readonly totalGames: number;
  readonly playerWins: number;
  readonly opponentWins: number;
  readonly draws: number;
  readonly incompleteGames: number;

  readonly avgTurns: number;
  readonly avgDurationMs: number;
  readonly avgPlayerUnitsDestroyed: number;
  readonly avgOpponentUnitsDestroyed: number;

  readonly totalViolations: number;
  readonly violationsByType: Record<string, number>;
  readonly violationsBySeverity: {
    readonly critical: number;
    readonly warning: number;
  };

  readonly playerWinRate: number;
  readonly opponentWinRate: number;
  readonly drawRate: number;
}
