/**
 * Piloting Skill Rolls (PSR)
 * Implements BattleTech piloting skill rolls, trigger management,
 * modifier stacking, and resolution logic.
 *
 * All functions follow immutable patterns and use injectable DiceRoller.
 *
 * @spec openspec/changes/full-combat-parity/specs/piloting-skill-rolls/spec.md
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  IComponentDamageState,
  IPendingPSR,
  IUnitGameState,
} from '@/types/gameplay';

import { defaultD6Roller } from './diceTypes';
import { D6Roller, roll2d6 } from './hitLocation';

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// PSR Resolution
// =============================================================================

/**
 * Resolve a single PSR.
 * Formula: 2d6 >= (pilotingSkill + allModifiers) = success
 *
 * @param pilotingSkill - Base piloting skill (typically 4-6)
 * @param psr - The pending PSR to resolve
 * @param componentDamage - Current component damage state for modifier calculation
 * @param pilotWounds - Current pilot wound count
 * @param diceRoller - Injectable dice roller for deterministic testing
 * @returns PSR result with roll details and pass/fail
 */
export function resolvePSR(
  pilotingSkill: number,
  psr: IPendingPSR,
  componentDamage: IComponentDamageState,
  pilotWounds: number,
  diceRoller: D6Roller = defaultD6Roller,
): IPSRResult {
  const modifiers = calculatePSRModifiers(psr, componentDamage, pilotWounds);

  const totalModifier = modifiers.reduce((sum, m) => sum + m.value, 0);

  // Special case: Shutdown PSR has fixed TN 3 (piloting skill not used)
  const isShutdownPSR = psr.triggerSource === PSRTrigger.Shutdown;
  const targetNumber = isShutdownPSR ? 3 : pilotingSkill + totalModifier;

  const roll = roll2d6(diceRoller);

  return {
    psr,
    targetNumber,
    roll: roll.total,
    dice: roll.dice,
    passed: roll.total >= targetNumber,
    modifiers,
  };
}

/**
 * Resolve all pending PSRs for a unit.
 * Implements the first-failure-clears-remaining rule:
 * - PSRs are resolved in order
 * - First failure causes fall and clears all remaining PSRs
 *
 * @param pilotingSkill - Base piloting skill
 * @param pendingPSRs - All pending PSRs for this unit
 * @param componentDamage - Current component damage
 * @param pilotWounds - Current pilot wounds
 * @param diceRoller - Injectable dice roller
 * @returns Batch result with all rolled PSRs and any cleared ones
 */
export function resolveAllPSRs(
  pilotingSkill: number,
  pendingPSRs: readonly IPendingPSR[],
  componentDamage: IComponentDamageState,
  pilotWounds: number,
  diceRoller: D6Roller = defaultD6Roller,
): IPSRBatchResult {
  if (pendingPSRs.length === 0) {
    return {
      results: [],
      unitFell: false,
      clearedPSRs: [],
    };
  }

  const results: IPSRResult[] = [];
  const clearedPSRs: IPendingPSR[] = [];

  for (let i = 0; i < pendingPSRs.length; i++) {
    const psr = pendingPSRs[i];
    const result = resolvePSR(
      pilotingSkill,
      psr,
      componentDamage,
      pilotWounds,
      diceRoller,
    );
    results.push(result);

    if (!result.passed) {
      // First failure: clear all remaining PSRs
      for (let j = i + 1; j < pendingPSRs.length; j++) {
        clearedPSRs.push(pendingPSRs[j]);
      }
      return {
        results,
        unitFell: true,
        clearedPSRs,
      };
    }
  }

  return {
    results,
    unitFell: false,
    clearedPSRs: [],
  };
}

// =============================================================================
// PSR Modifier Calculation
// =============================================================================

/**
 * Calculate all applicable modifiers for a PSR.
 * Stacking rules:
 * - Gyro hits: +3 per hit
 * - Pilot wounds: +1 per wound
 * - Actuator damage: varies by type
 * - PSR-specific additionalModifier from the trigger
 */
export function calculatePSRModifiers(
  psr: IPendingPSR,
  componentDamage: IComponentDamageState,
  pilotWounds: number,
): readonly IPSRModifier[] {
  const modifiers: IPSRModifier[] = [];

  // Gyro damage: +3 per hit
  if (componentDamage.gyroHits > 0) {
    modifiers.push({
      name: 'Gyro damage',
      value: componentDamage.gyroHits * 3,
      source: 'gyro',
    });
  }

  // Pilot wounds: +1 per wound
  if (pilotWounds > 0) {
    modifiers.push({
      name: 'Pilot wounds',
      value: pilotWounds,
      source: 'pilot',
    });
  }

  // Leg actuator damage modifiers
  const actuators = componentDamage.actuators;
  if (actuators[ActuatorType.HIP]) {
    modifiers.push({
      name: 'Hip actuator destroyed',
      value: 2,
      source: 'actuator',
    });
  }
  if (actuators[ActuatorType.UPPER_LEG]) {
    modifiers.push({
      name: 'Upper leg actuator destroyed',
      value: 1,
      source: 'actuator',
    });
  }
  if (actuators[ActuatorType.LOWER_LEG]) {
    modifiers.push({
      name: 'Lower leg actuator destroyed',
      value: 1,
      source: 'actuator',
    });
  }
  if (actuators[ActuatorType.FOOT]) {
    modifiers.push({
      name: 'Foot actuator destroyed',
      value: 1,
      source: 'actuator',
    });
  }

  // PSR-specific additional modifier (e.g., DFA miss +4)
  if (psr.additionalModifier !== 0) {
    modifiers.push({
      name: `${psr.reason} modifier`,
      value: psr.additionalModifier,
      source: psr.triggerSource,
    });
  }

  return modifiers;
}

// =============================================================================
// PSR Trigger Generators
// =============================================================================

/**
 * Create a pending PSR for 20+ damage in a single phase.
 */
export function createDamagePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: '20+ damage this phase',
    additionalModifier: 0,
    triggerSource: PSRTrigger.PhaseDamage20Plus,
  };
}

/**
 * Create a pending PSR for leg damage (armor breached, structure took damage).
 */
export function createLegDamagePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Leg damage (internal structure exposed)',
    additionalModifier: 0,
    triggerSource: PSRTrigger.LegDamage,
  };
}

/**
 * Create a pending PSR for hip actuator critical hit.
 */
export function createHipActuatorPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Hip actuator destroyed',
    additionalModifier: 0,
    triggerSource: PSRTrigger.HipActuatorDestroyed,
  };
}

/**
 * Create a pending PSR for gyro critical hit.
 */
export function createGyroPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Gyro hit',
    additionalModifier: 0,
    triggerSource: PSRTrigger.GyroHit,
  };
}

/**
 * Create a pending PSR for upper leg actuator critical hit.
 */
export function createUpperLegActuatorPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Upper leg actuator hit',
    additionalModifier: 0,
    triggerSource: PSRTrigger.UpperLegActuatorHit,
  };
}

/**
 * Create a pending PSR for lower leg actuator critical hit.
 */
export function createLowerLegActuatorPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Lower leg actuator hit',
    additionalModifier: 0,
    triggerSource: PSRTrigger.LowerLegActuatorHit,
  };
}

/**
 * Create a pending PSR for foot actuator critical hit.
 */
export function createFootActuatorPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Foot actuator hit',
    additionalModifier: 0,
    triggerSource: PSRTrigger.FootActuatorHit,
  };
}

/**
 * Create a pending PSR for being kicked.
 */
export function createKickedPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Kicked',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Kicked,
  };
}

/**
 * Create a pending PSR for being charged (target).
 */
export function createChargedPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Charged',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Charged,
  };
}

/**
 * Create a pending PSR for being hit by DFA (target).
 */
export function createDFATargetPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Hit by DFA',
    additionalModifier: 0,
    triggerSource: PSRTrigger.DFATarget,
  };
}

/**
 * Create a pending PSR for being pushed.
 */
export function createPushedPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Pushed',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Pushed,
  };
}

/**
 * Create a pending PSR for attacker kick miss.
 */
export function createKickMissPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Kick missed',
    additionalModifier: 0,
    triggerSource: PSRTrigger.KickMiss,
  };
}

/**
 * Create a pending PSR for attacker charge miss.
 */
export function createChargeMissPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Charge missed',
    additionalModifier: 0,
    triggerSource: PSRTrigger.ChargeMiss,
  };
}

/**
 * Create a pending PSR for attacker DFA miss (with +4 modifier).
 */
export function createDFAMissPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'DFA missed',
    additionalModifier: 4,
    triggerSource: PSRTrigger.DFAMiss,
  };
}

/**
 * Create a pending PSR for reactor shutdown.
 * Note: This PSR uses a fixed TN of 3, not piloting skill.
 */
export function createShutdownPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Reactor shutdown',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Shutdown,
  };
}

/**
 * Create a pending PSR for standing up.
 */
export function createStandingUpPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Standing up',
    additionalModifier: 0,
    triggerSource: PSRTrigger.StandingUp,
  };
}

// Terrain PSR triggers

/**
 * Create a pending PSR for entering rubble terrain.
 */
export function createRubblePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Entering rubble',
    additionalModifier: 0,
    triggerSource: PSRTrigger.EnteringRubble,
  };
}

/**
 * Create a pending PSR for running through rough terrain.
 */
export function createRunningRoughTerrainPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Running through rough terrain',
    additionalModifier: 0,
    triggerSource: PSRTrigger.RunningRoughTerrain,
  };
}

/**
 * Create a pending PSR for moving on ice.
 */
export function createIcePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Moving on ice',
    additionalModifier: 0,
    triggerSource: PSRTrigger.MovingOnIce,
  };
}

/**
 * Create a pending PSR for entering water.
 */
export function createEnteringWaterPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Entering water',
    additionalModifier: 0,
    triggerSource: PSRTrigger.EnteringWater,
  };
}

/**
 * Create a pending PSR for exiting water.
 */
export function createExitingWaterPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Exiting water',
    additionalModifier: 0,
    triggerSource: PSRTrigger.ExitingWater,
  };
}

/**
 * Create a pending PSR for skidding on pavement/ice.
 */
export function createSkiddingPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Skidding',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Skidding,
  };
}

// Movement with damage triggers

/**
 * Create a pending PSR for running with a damaged hip (per hex moved).
 */
export function createRunningDamagedHipPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Running with damaged hip',
    additionalModifier: 0,
    triggerSource: PSRTrigger.RunningDamagedHip,
  };
}

/**
 * Create a pending PSR for running with a damaged gyro.
 */
export function createRunningDamagedGyroPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Running with damaged gyro',
    additionalModifier: 0,
    triggerSource: PSRTrigger.RunningDamagedGyro,
  };
}

// Collapse/failure triggers

/**
 * Create a pending PSR for building collapse.
 */
export function createBuildingCollapsePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Building collapse',
    additionalModifier: 0,
    triggerSource: PSRTrigger.BuildingCollapse,
  };
}

/**
 * Create a pending PSR for MASC failure.
 */
export function createMASCFailurePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'MASC failure',
    additionalModifier: 0,
    triggerSource: PSRTrigger.MASCFailure,
  };
}

/**
 * Create a pending PSR for supercharger failure.
 */
export function createSuperchargerFailurePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Supercharger failure',
    additionalModifier: 0,
    triggerSource: PSRTrigger.SuperchargerFailure,
  };
}

// =============================================================================
// PSR Trigger Checks
// =============================================================================

/**
 * Check if a unit has accumulated 20+ damage this phase.
 * Should be called at end of weapon attack phase.
 */
export function checkPhaseDamagePSR(
  unitState: IUnitGameState,
): IPendingPSR | null {
  const damageThisPhase = unitState.damageThisPhase ?? 0;
  if (damageThisPhase >= 20) {
    return createDamagePSR(unitState.id);
  }
  return null;
}

/**
 * Check if a leg location took structure damage (for PSR trigger).
 * Call after damage resolution when a leg takes structure damage.
 */
export function isLegLocation(location: string): boolean {
  return location === 'left_leg' || location === 'right_leg';
}

/**
 * Attempt to stand up a prone unit.
 * Returns the PSR to resolve and the walking MP cost.
 *
 * @param unitState - Current unit state (must be prone)
 * @param pilotingSkill - Pilot's piloting skill
 * @param walkingMP - Unit's base walking MP
 * @returns Object describing the stand-up attempt, or null if not prone
 */
export function createStandUpAttempt(
  unitState: IUnitGameState,
  walkingMP: number,
): { psr: IPendingPSR; mpCost: number } | null {
  if (!unitState.prone) {
    return null;
  }

  return {
    psr: createStandingUpPSR(unitState.id),
    mpCost: walkingMP,
  };
}

/**
 * Check if a gyro is destroyed (2 hits for standard gyro).
 * A destroyed gyro means automatic fall — no PSR possible.
 */
export function isGyroDestroyed(
  componentDamage: IComponentDamageState,
): boolean {
  return componentDamage.gyroHits >= 2;
}
