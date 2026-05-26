/**
 * Core simulation type definitions
 */

import type { IEnvironmentalConditions } from '@/types/gameplay';
import type {
  IMapPreset,
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

  /** Optional rules enabled for the simulation run. */
  readonly optionalRules?: readonly string[];

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

  /**
   * Per `add-procedural-map-variety`: optional map preset. When supplied,
   * `ScenarioGenerator` overlays the preset's feature directives on base
   * biome generation so the hex grid carries clustered woods, buildings,
   * roads, and pavement. Terrain placement is seeded from `seed`, so the
   * map stays a deterministic function of the simulation seed. When
   * omitted, the legacy weighted-table terrain is used unchanged.
   */
  readonly mapPreset?: IMapPreset;

  /**
   * Optional battlefield environment used by heat resolution. Atmosphere and
   * temperature modify effective dissipation through the shared environmental
   * combat helper.
   */
  readonly environmentalConditions?: IEnvironmentalConditions;
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
