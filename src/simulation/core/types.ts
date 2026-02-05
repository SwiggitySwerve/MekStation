/**
 * Core simulation type definitions
 */

import { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

/**
 * Configuration for a simulation run
 */
export interface ISimulationConfig {
  /** Random seed for reproducibility */
  readonly seed: number;

  /** Maximum turns before draw (0 = no limit) */
  readonly turnLimit: number;

  /** Number of units per side */
  readonly unitCount: {
    readonly player: number;
    readonly opponent: number;
  };

  /** Map radius in hexes */
  readonly mapRadius: number;
}

/**
 * Result of a completed simulation
 */
export interface ISimulationResult {
  /** Seed used for this simulation */
  readonly seed: number;

  /** Winner of the simulation */
  readonly winner: 'player' | 'opponent' | 'draw' | null;

  /** Number of turns played */
  readonly turns: number;

  /** Duration in milliseconds */
  readonly durationMs: number;

  /** All game events that occurred */
  readonly events: readonly IGameEvent[];
}
