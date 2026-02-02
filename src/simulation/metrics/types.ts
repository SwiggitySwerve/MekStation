/**
 * Metrics type definitions for simulation analysis
 */

import { IViolation } from '../invariants/types';

/**
 * Per-game metrics collected from a single simulation run
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
