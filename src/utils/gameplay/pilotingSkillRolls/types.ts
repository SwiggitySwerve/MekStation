/**
 * Piloting Skill Rolls (PSR) - Shared Types
 * Type definitions for PSR results, modifiers, and triggers.
 */

import type { IPendingPSR } from '@/types/gameplay/GameSessionInterfaces';

/**
 * Result of a single PSR resolution.
 */
export interface IPSRResult {
  /** The pending PSR that was resolved */
  readonly psr: IPendingPSR;
  /** Target number (piloting skill + all modifiers) */
  readonly targetNumber: number;
  /** The 2d6 roll result */
  readonly roll: number;
  /** Individual dice */
  readonly dice: readonly number[];
  /** Whether the PSR passed (roll >= targetNumber) */
  readonly passed: boolean;
  /** Breakdown of all modifiers applied */
  readonly modifiers: readonly IPSRModifier[];
}

/**
 * A single modifier applied to a PSR.
 */
export interface IPSRModifier {
  readonly name: string;
  readonly value: number;
  readonly source: string;
}

/**
 * Result of resolving all pending PSRs for a unit.
 */
export interface IPSRBatchResult {
  /** Individual PSR results (only those actually rolled) */
  readonly results: readonly IPSRResult[];
  /** Whether any PSR failed (unit falls) */
  readonly unitFell: boolean;
  /** PSRs that were cleared without rolling (due to first-failure-clears rule) */
  readonly clearedPSRs: readonly IPendingPSR[];
}

/**
 * PSR trigger types — all 26 canonical trigger sources.
 */
export enum PSRTrigger {
  // Damage triggers
  PhaseDamage20Plus = '20+_damage',
  LegDamage = 'leg_damage',

  // Component damage triggers
  HipActuatorDestroyed = 'hip_actuator_destroyed',
  GyroHit = 'gyro_hit',
  UpperLegActuatorHit = 'upper_leg_actuator_hit',
  LowerLegActuatorHit = 'lower_leg_actuator_hit',
  FootActuatorHit = 'foot_actuator_hit',

  // Physical attack triggers (target)
  Kicked = 'kicked',
  Charged = 'charged',
  DFATarget = 'dfa_target',
  Pushed = 'pushed',

  // Physical attack miss triggers (attacker)
  KickMiss = 'kick_miss',
  ChargeMiss = 'charge_miss',
  DFAMiss = 'dfa_miss',

  // Shutdown/startup triggers
  Shutdown = 'heat_shutdown',
  StandingUp = 'standing_up',

  // Terrain triggers
  EnteringRubble = 'entering_rubble',
  RunningRoughTerrain = 'running_rough_terrain',
  MovingOnIce = 'moving_on_ice',
  EnteringWater = 'entering_water',
  ExitingWater = 'exiting_water',
  Skidding = 'skidding',

  // Movement with damage triggers
  RunningDamagedHip = 'running_damaged_hip',
  RunningDamagedGyro = 'running_damaged_gyro',

  // Collapse/failure triggers
  BuildingCollapse = 'building_collapse',
  MASCFailure = 'masc_failure',
  SuperchargerFailure = 'supercharger_failure',
}
