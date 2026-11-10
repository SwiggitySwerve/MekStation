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
 * Contract morale does not change them (a ROUTED enemy is skipped before the
 * check, in `scenarioGenerationProcessor`).
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
// Scenario-Type Roll Offset
// =============================================================================

/**
 * The fixed amount added to the scenario-type roll (see `selectScenarioType`).
 *
 * Contract morale has NO effect on it. This used to be
 * `1 + (STALEMATE - level) * 5`, which moved the roll from +16 (ROUTED) to
 * -14 (OVERWHELMING). The pinned MekHQ (e7adc2c) has no morale modifier on a
 * scenario-type roll: the weekly AtB generator that had one is retired
 * (`CampaignNewDayManager.java:2292-2293`, "Legacy AtB scenario generation used
 * to run here on Mondays. It was retired with the per-type AtBScenario classes;
 * StratCon generates its own scenarios"). Its only effect of enemy morale on
 * ordinary scenarios is that a ROUTED enemy yields none
 * (`StratConRulesManager.java:4492-4495`), applied in
 * `scenarioGenerationProcessor`.
 *
 * The value 1 is what the old formula gave at STALEMATE, the only level any
 * contract has ever had, so it is kept to leave every existing run unchanged.
 * It is MekStation's own offset, not a pinned one.
 */
export const SCENARIO_TYPE_ROLL_OFFSET = 1;

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
 * @param contract - The contract (currently unused in the base calculation)
 * @param random - Injectable random function (0-1 range)
 * @returns true if a battle occurs, false otherwise
 *
 * @example
 * const team: ICombatTeam = { forceId: 'f1', role: CombatRole.MANEUVER, battleChance: 40 };
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
