/**
 * Core simulation type definitions
 */

import type {
  ScenarioObjectiveType,
  VictoryCondition,
} from '@/types/scenario/ScenarioInterfaces';

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

  /**
   * Per `add-scenario-objective-engine`: optional scenario objective
   * type. When set to `capture` / `defend` / `breakthrough`,
   * `ScenarioGenerator` places objective hexes deterministically from
   * the seed. Omitted / `destroy` → markerless destruction scenario.
   */
  readonly objectiveType?: ScenarioObjectiveType;

  /**
   * Optional victory conditions used to derive objective placement
   * detail (Capture objective count, hold turns, Breakthrough
   * required-units). When absent the placement uses engine defaults.
   */
  readonly victoryConditions?: readonly VictoryCondition[];
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
