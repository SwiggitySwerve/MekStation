/**
 * Scenario Type Selection Tables
 *
 * Implements MekHQ's AtB scenario type selection tables for each combat role.
 * Each role has a different dice table (d40, d60, d20, d10) that determines
 * the scenario type and whether the player attacks or defends.
 *
 * @module campaign/scenario/scenarioTypeSelection
 */

import {
  CombatRole,
  AtBScenarioType,
  AtBMoraleLevel,
} from '@/types/campaign/scenario/scenarioTypes';

import { calculateBattleTypeMod, type RandomFn } from './battleChance';

// =============================================================================
// Interface Definition
// =============================================================================

/**
 * Result of scenario type selection.
 *
 * Contains the selected scenario type and whether the player is the attacker.
 *
 * @example
 * const result: IScenarioTypeResult = {
 *   scenarioType: AtBScenarioType.BREAKTHROUGH,
 *   isAttacker: true,
 * };
 */
export interface IScenarioTypeResult {
  /** The selected scenario type */
  readonly scenarioType: AtBScenarioType;

  /** true = player attacks, false = player defends */
  readonly isAttacker: boolean;
}

// =============================================================================
// Maneuver Scenario Table (d40)
// =============================================================================

/**
 * Select scenario type for Maneuver combat role.
 *
 * Maneuver forces use a d40 table with the following distribution:
 * - 1: base_attack (enemy attacks)
 * - 2-8: breakthrough (player attacks)
 * - 9-16: standup (player attacks)
 * - 17-24: standup (enemy attacks)
 * - 25-32: chase/hold_the_line (player attacks)
 * - 33-40: hold_the_line (player attacks)
 * - 41+: base_attack (player attacks)
 *
 * @param roll - The d40 roll result (1-40+)
 * @returns IScenarioTypeResult with scenario type and attacker status
 *
 * @example
 * const result = selectManeuverScenario(5);
 * // { scenarioType: 'breakthrough', isAttacker: true }
 */
export function selectManeuverScenario(roll: number): IScenarioTypeResult {
  // Clamp roll to valid range
  const clampedRoll = Math.max(1, roll);

  if (clampedRoll === 1) {
    return Object.freeze({
      scenarioType: AtBScenarioType.BASE_ATTACK,
      isAttacker: false,
    });
  }
  if (clampedRoll >= 2 && clampedRoll <= 8) {
    return Object.freeze({
      scenarioType: AtBScenarioType.BREAKTHROUGH,
      isAttacker: true,
    });
  }
  if (clampedRoll >= 9 && clampedRoll <= 16) {
    return Object.freeze({
      scenarioType: AtBScenarioType.STANDUP,
      isAttacker: true,
    });
  }
  if (clampedRoll >= 17 && clampedRoll <= 24) {
    return Object.freeze({
      scenarioType: AtBScenarioType.STANDUP,
      isAttacker: false,
    });
  }
  if (clampedRoll >= 25 && clampedRoll <= 32) {
    // 25-32: chase/hold_the_line - alternate between them
    const isChase = clampedRoll % 2 === 1;
    return Object.freeze({
      scenarioType: isChase
        ? AtBScenarioType.CHASE
        : AtBScenarioType.HOLD_THE_LINE,
      isAttacker: true,
    });
  }
  if (clampedRoll >= 33 && clampedRoll <= 40) {
    return Object.freeze({
      scenarioType: AtBScenarioType.HOLD_THE_LINE,
      isAttacker: true,
    });
  }
  // 41+: base_attack (player attacks)
  return Object.freeze({
    scenarioType: AtBScenarioType.BASE_ATTACK,
    isAttacker: true,
  });
}

// =============================================================================
// Patrol Scenario Table (d60)
// =============================================================================

/**
 * Select scenario type for Patrol combat role.
 *
 * Patrol forces use a d60 table with the following distribution:
 * - 1: base_attack (enemy attacks)
 * - 2-10: chase/hide_and_seek (player attacks)
 * - 11-20: hide_and_seek (player attacks)
 * - 21-30: probe (player attacks)
 * - 31-40: probe (enemy attacks)
 * - 41-50: extraction (player attacks)
 * - 51-60: recon_raid (player attacks)
 *
 * @param roll - The d60 roll result (1-60+)
 * @returns IScenarioTypeResult with scenario type and attacker status
 *
 * @example
 * const result = selectPatrolScenario(25);
 * // { scenarioType: 'probe', isAttacker: true }
 */
export function selectPatrolScenario(roll: number): IScenarioTypeResult {
  // Clamp roll to valid range
  const clampedRoll = Math.max(1, roll);

  if (clampedRoll === 1) {
    return Object.freeze({
      scenarioType: AtBScenarioType.BASE_ATTACK,
      isAttacker: false,
    });
  }
  if (clampedRoll >= 2 && clampedRoll <= 10) {
    // 2-10: chase/hide_and_seek - alternate between them
    const isChase = clampedRoll % 2 === 0;
    return Object.freeze({
      scenarioType: isChase
        ? AtBScenarioType.CHASE
        : AtBScenarioType.HIDE_AND_SEEK,
      isAttacker: true,
    });
  }
  if (clampedRoll >= 11 && clampedRoll <= 20) {
    return Object.freeze({
      scenarioType: AtBScenarioType.HIDE_AND_SEEK,
      isAttacker: true,
    });
  }
  if (clampedRoll >= 21 && clampedRoll <= 30) {
    return Object.freeze({
      scenarioType: AtBScenarioType.PROBE,
      isAttacker: true,
    });
  }
  if (clampedRoll >= 31 && clampedRoll <= 40) {
    return Object.freeze({
      scenarioType: AtBScenarioType.PROBE,
      isAttacker: false,
    });
  }
  if (clampedRoll >= 41 && clampedRoll <= 50) {
    return Object.freeze({
      scenarioType: AtBScenarioType.EXTRACTION,
      isAttacker: true,
    });
  }
  // 51-60+: recon_raid (player attacks)
  return Object.freeze({
    scenarioType: AtBScenarioType.RECON_RAID,
    isAttacker: true,
  });
}

// =============================================================================
// Frontline Scenario Table (d20)
// =============================================================================

/**
 * Select scenario type for Frontline combat role.
 *
 * Frontline forces use a d20 table with the following distribution:
 * - 1: base_attack (enemy attacks)
 * - 2-4: hold_the_line (enemy attacks)
 * - 5-8: recon_raid (enemy attacks)
 * - 9-12: extraction (enemy attacks)
 * - 13-16: hide_and_seek (player attacks)
 * - 17-20: breakthrough (enemy attacks)
 *
 * @param roll - The d20 roll result (1-20+)
 * @returns IScenarioTypeResult with scenario type and attacker status
 *
 * @example
 * const result = selectFrontlineScenario(18);
 * // { scenarioType: 'breakthrough', isAttacker: false }
 */
export function selectFrontlineScenario(roll: number): IScenarioTypeResult {
  // Clamp roll to valid range
  const clampedRoll = Math.max(1, roll);

  if (clampedRoll === 1) {
    return Object.freeze({
      scenarioType: AtBScenarioType.BASE_ATTACK,
      isAttacker: false,
    });
  }
  if (clampedRoll >= 2 && clampedRoll <= 4) {
    return Object.freeze({
      scenarioType: AtBScenarioType.HOLD_THE_LINE,
      isAttacker: false,
    });
  }
  if (clampedRoll >= 5 && clampedRoll <= 8) {
    return Object.freeze({
      scenarioType: AtBScenarioType.RECON_RAID,
      isAttacker: false,
    });
  }
  if (clampedRoll >= 9 && clampedRoll <= 12) {
    return Object.freeze({
      scenarioType: AtBScenarioType.EXTRACTION,
      isAttacker: false,
    });
  }
  if (clampedRoll >= 13 && clampedRoll <= 16) {
    return Object.freeze({
      scenarioType: AtBScenarioType.HIDE_AND_SEEK,
      isAttacker: true,
    });
  }
  // 17-20+: breakthrough (enemy attacks)
  return Object.freeze({
    scenarioType: AtBScenarioType.BREAKTHROUGH,
    isAttacker: false,
  });
}

// =============================================================================
// Training/Cadre Scenario Table (d10)
// =============================================================================

/**
 * Select scenario type for Training/Cadre combat roles.
 *
 * Training and Cadre forces use the same d10 table with the following distribution:
 * - 1: base_attack (enemy attacks)
 * - 2-3: hold_the_line (enemy attacks)
 * - 4-5: breakthrough (player attacks)
 * - 6-7: chase/breakthrough (player attacks)
 * - 8-9: hide_and_seek (enemy attacks)
 * - 10: chase/hold_the_line (player attacks)
 *
 * @param roll - The d10 roll result (1-10+)
 * @returns IScenarioTypeResult with scenario type and attacker status
 *
 * @example
 * const result = selectTrainingScenario(1);
 * // { scenarioType: 'base_attack', isAttacker: false }
 */
export function selectTrainingScenario(roll: number): IScenarioTypeResult {
  // Clamp roll to valid range
  const clampedRoll = Math.max(1, roll);

  if (clampedRoll === 1) {
    return Object.freeze({
      scenarioType: AtBScenarioType.BASE_ATTACK,
      isAttacker: false,
    });
  }
  if (clampedRoll >= 2 && clampedRoll <= 3) {
    return Object.freeze({
      scenarioType: AtBScenarioType.HOLD_THE_LINE,
      isAttacker: false,
    });
  }
  if (clampedRoll >= 4 && clampedRoll <= 5) {
    return Object.freeze({
      scenarioType: AtBScenarioType.BREAKTHROUGH,
      isAttacker: true,
    });
  }
  if (clampedRoll >= 6 && clampedRoll <= 7) {
    // 6-7: chase/breakthrough - alternate between them
    const isChase = clampedRoll === 6;
    return Object.freeze({
      scenarioType: isChase
        ? AtBScenarioType.CHASE
        : AtBScenarioType.BREAKTHROUGH,
      isAttacker: true,
    });
  }
  if (clampedRoll >= 8 && clampedRoll <= 9) {
    return Object.freeze({
      scenarioType: AtBScenarioType.HIDE_AND_SEEK,
      isAttacker: false,
    });
  }
  // 10+: chase/hold_the_line (player attacks)
  const isChase = clampedRoll % 2 === 0;
  return Object.freeze({
    scenarioType: isChase
      ? AtBScenarioType.CHASE
      : AtBScenarioType.HOLD_THE_LINE,
    isAttacker: true,
  });
}

// =============================================================================
// Scenario Type Dispatcher
// =============================================================================

/**
 * Select scenario type based on combat role and morale level.
 *
 * Routes to the appropriate scenario table based on combat role, applies
 * morale modifier to the roll, and returns the scenario type result.
 *
 * The morale modifier is calculated as:
 * `battleTypeMod = 1 + (STALEMATE.ordinal - current.ordinal) × 5`
 *
 * This modifier is added to the base roll before table lookup.
 *
 * @param role - The combat role (determines which table to use)
 * @param moraleLevel - The contract morale level (affects roll modifier)
 * @param random - Injectable random function returning 0-1
 * @returns IScenarioTypeResult with scenario type and attacker status
 *
 * @example
 * const result = selectScenarioType(
 *   CombatRole.MANEUVER,
 *   AtBMoraleLevel.STALEMATE,
 *   Math.random
 * );
 */
export function selectScenarioType(
  role: CombatRole,
  moraleLevel: AtBMoraleLevel,
  random: RandomFn,
): IScenarioTypeResult {
  // Calculate base roll based on role's table size
  let maxRoll: number;
  switch (role) {
    case CombatRole.MANEUVER:
      maxRoll = 40;
      break;
    case CombatRole.PATROL:
      maxRoll = 60;
      break;
    case CombatRole.FRONTLINE:
      maxRoll = 20;
      break;
    case CombatRole.TRAINING:
    case CombatRole.CADRE:
      maxRoll = 10;
      break;
    default:
      // Auxiliary and Reserve don't have scenario tables
      maxRoll = 10;
  }

  // Generate base roll (1 to maxRoll)
  const baseRoll = Math.floor(random() * maxRoll) + 1;

  // Apply morale modifier
  const moraleModifier = calculateBattleTypeMod(moraleLevel);
  const modifiedRoll = Math.max(1, baseRoll + moraleModifier);

  // Route to appropriate table
  switch (role) {
    case CombatRole.MANEUVER:
      return selectManeuverScenario(modifiedRoll);
    case CombatRole.PATROL:
      return selectPatrolScenario(modifiedRoll);
    case CombatRole.FRONTLINE:
      return selectFrontlineScenario(modifiedRoll);
    case CombatRole.TRAINING:
    case CombatRole.CADRE:
      return selectTrainingScenario(modifiedRoll);
    default:
      // Fallback for Auxiliary/Reserve (shouldn't happen in practice)
      return selectTrainingScenario(modifiedRoll);
  }
}
