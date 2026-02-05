/**
 * Battle Chance Calculator for AtB Scenarios
 *
 * Implements the battle chance calculation system for Against the Bot (AtB)
 * scenario generation. Each combat role has a base battle chance that is
 * checked weekly to determine if a scenario is generated.
 *
 * @module campaign/scenario/battleChance
 */

import { type IContract } from '@/types/campaign/Mission';
import {
  CombatRole,
  AtBMoraleLevel,
  MORALE_VALUES,
  type ICombatTeam,
} from '@/types/campaign/scenario/scenarioTypes';

// =============================================================================
// Random Function Type
// =============================================================================

/**
 * Injectable random function for deterministic testing.
 *
 * Returns a value between 0 (inclusive) and 1 (exclusive).
 * This allows tests to inject seeded random values for reproducibility.
 *
 * @example
 * const random: RandomFn = () => Math.random();
 * const seededRandom: RandomFn = () => 0.5;
 */
export type RandomFn = () => number;

// =============================================================================
// Base Battle Chance Constants
// =============================================================================

/**
 * Base battle chance percentage for each combat role.
 *
 * These values are checked weekly to determine if a scenario is generated.
 * The actual battle chance is modified by the contract's morale level.
 *
 * Based on MekHQ CombatTeam.java battle chance values.
 *
 * @example
 * const chance = BASE_BATTLE_CHANCE[CombatRole.MANEUVER]; // 40
 */
export const BASE_BATTLE_CHANCE: Record<CombatRole, number> = {
  [CombatRole.MANEUVER]: 40,
  [CombatRole.FRONTLINE]: 20,
  [CombatRole.PATROL]: 60,
  [CombatRole.TRAINING]: 10,
  [CombatRole.CADRE]: 10,
  [CombatRole.AUXILIARY]: 0,
  [CombatRole.RESERVE]: 0,
};

// =============================================================================
// Battle Type Modifier Calculation
// =============================================================================

/**
 * Calculate the battle type modifier based on morale level.
 *
 * The modifier is calculated using the formula:
 * `battleTypeMod = 1 + (STALEMATE.ordinal - current.ordinal) × 5`
 *
 * This means:
 * - STALEMATE (0) → 1 (no modifier)
 * - ADVANCING (+1) → 6 (5% increase)
 * - DOMINATING (+2) → 11 (10% increase)
 * - OVERWHELMING (+3) → 16 (15% increase)
 * - WEAKENED (-1) → -4 (5% decrease)
 * - CRITICAL (-2) → -9 (10% decrease)
 * - ROUTED (-3) → -14 (15% decrease)
 *
 * @param moraleLevel - The current morale level
 * @returns The battle type modifier (can be negative)
 *
 * @example
 * const mod = calculateBattleTypeMod(AtBMoraleLevel.OVERWHELMING); // 16
 */
export function calculateBattleTypeMod(moraleLevel: AtBMoraleLevel): number {
  // Get the numeric value for the morale level
  const currentValue = MORALE_VALUES[moraleLevel];
  const stalemateValue = MORALE_VALUES[AtBMoraleLevel.STALEMATE];

  // Formula: 1 + (STALEMATE.value - current.value) * 5
  return 1 + (stalemateValue - currentValue) * 5;
}

// =============================================================================
// Battle Check Function
// =============================================================================

/**
 * Check if a battle occurs for a combat team.
 *
 * Performs a d100 roll against the team's base battle chance.
 * Auxiliary and Reserve roles always return false (0% chance).
 *
 * The roll is calculated as: `floor(random() * 100) + 1`
 * This produces values from 1 to 100 inclusive.
 *
 * A battle occurs if: `roll <= baseChance`
 *
 * @param team - The combat team to check
 * @param contract - The contract (for morale level, currently unused in base calculation)
 * @param random - Injectable random function (0-1 range)
 * @returns true if a battle occurs, false otherwise
 *
 * @example
 * const team: ICombatTeam = { forceId: 'f1', role: CombatRole.MANEUVER, battleChance: 40 };
 * const contract = { ...contract, moraleLevel: AtBMoraleLevel.STALEMATE };
 * const random = () => Math.random();
 * const hasBattle = checkForBattle(team, contract, random);
 */
export function checkForBattle(
  team: ICombatTeam,
  contract: IContract,
  random: RandomFn,
): boolean {
  // Auxiliary and Reserve roles never have battles
  if (team.role === CombatRole.AUXILIARY || team.role === CombatRole.RESERVE) {
    return false;
  }

  // Get the base battle chance for this role
  const baseChance = BASE_BATTLE_CHANCE[team.role];

  // Roll d100 (1-100)
  const roll = Math.floor(random() * 100) + 1;

  // Battle occurs if roll is within the chance
  return roll <= baseChance;
}
