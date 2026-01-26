/**
 * Faction Standing Gameplay Effects
 *
 * Pure functions that return numeric modifiers based on faction standing level.
 * Each effect uses a lookup table with exact MekHQ values.
 *
 * Based on MekHQ's FactionStandings system.
 */

import { FactionStandingLevel } from '@/types/campaign/factionStanding/IFactionStanding';

/**
 * Negotiation modifier: -4 to +4
 * Affects contract negotiation rolls
 */
const NEGOTIATION_MODIFIER: Record<FactionStandingLevel, number> = {
  [FactionStandingLevel.LEVEL_0]: -4,
  [FactionStandingLevel.LEVEL_1]: -3,
  [FactionStandingLevel.LEVEL_2]: -2,
  [FactionStandingLevel.LEVEL_3]: -1,
  [FactionStandingLevel.LEVEL_4]: 0,
  [FactionStandingLevel.LEVEL_5]: 1,
  [FactionStandingLevel.LEVEL_6]: 2,
  [FactionStandingLevel.LEVEL_7]: 3,
  [FactionStandingLevel.LEVEL_8]: 4,
};

/**
 * Resupply weight modifier: 0.0 to 2.0
 * Affects resupply availability
 */
const RESUPPLY_WEIGHT_MODIFIER: Record<FactionStandingLevel, number> = {
  [FactionStandingLevel.LEVEL_0]: 0.0,
  [FactionStandingLevel.LEVEL_1]: 0.25,
  [FactionStandingLevel.LEVEL_2]: 0.5,
  [FactionStandingLevel.LEVEL_3]: 0.75,
  [FactionStandingLevel.LEVEL_4]: 1.0,
  [FactionStandingLevel.LEVEL_5]: 1.25,
  [FactionStandingLevel.LEVEL_6]: 1.5,
  [FactionStandingLevel.LEVEL_7]: 1.75,
  [FactionStandingLevel.LEVEL_8]: 2.0,
};

/**
 * Command circuit access: boolean
 * Available at Level 7+ only
 */
const COMMAND_CIRCUIT_ACCESS: Record<FactionStandingLevel, boolean> = {
  [FactionStandingLevel.LEVEL_0]: false,
  [FactionStandingLevel.LEVEL_1]: false,
  [FactionStandingLevel.LEVEL_2]: false,
  [FactionStandingLevel.LEVEL_3]: false,
  [FactionStandingLevel.LEVEL_4]: false,
  [FactionStandingLevel.LEVEL_5]: false,
  [FactionStandingLevel.LEVEL_6]: false,
  [FactionStandingLevel.LEVEL_7]: true,
  [FactionStandingLevel.LEVEL_8]: true,
};

/**
 * Outlawed status: boolean
 * True at Level 0-1 only
 */
const OUTLAWED_STATUS: Record<FactionStandingLevel, boolean> = {
  [FactionStandingLevel.LEVEL_0]: true,
  [FactionStandingLevel.LEVEL_1]: true,
  [FactionStandingLevel.LEVEL_2]: false,
  [FactionStandingLevel.LEVEL_3]: false,
  [FactionStandingLevel.LEVEL_4]: false,
  [FactionStandingLevel.LEVEL_5]: false,
  [FactionStandingLevel.LEVEL_6]: false,
  [FactionStandingLevel.LEVEL_7]: false,
  [FactionStandingLevel.LEVEL_8]: false,
};

/**
 * Batchall disabled: boolean
 * Clan challenges disabled at Level 0-2
 */
const BATCHALL_DISABLED: Record<FactionStandingLevel, boolean> = {
  [FactionStandingLevel.LEVEL_0]: true,
  [FactionStandingLevel.LEVEL_1]: true,
  [FactionStandingLevel.LEVEL_2]: true,
  [FactionStandingLevel.LEVEL_3]: false,
  [FactionStandingLevel.LEVEL_4]: false,
  [FactionStandingLevel.LEVEL_5]: false,
  [FactionStandingLevel.LEVEL_6]: false,
  [FactionStandingLevel.LEVEL_7]: false,
  [FactionStandingLevel.LEVEL_8]: false,
};

/**
 * Recruitment modifier: tickets and roll modifier
 * Tickets: 0 to 6 (max)
 * Roll modifier: -3 to +3
 */
const RECRUITMENT_MODIFIER: Record<
  FactionStandingLevel,
  { tickets: number; rollModifier: number }
> = {
  [FactionStandingLevel.LEVEL_0]: { tickets: 0, rollModifier: -3 },
  [FactionStandingLevel.LEVEL_1]: { tickets: 0, rollModifier: -2 },
  [FactionStandingLevel.LEVEL_2]: { tickets: 1, rollModifier: -1 },
  [FactionStandingLevel.LEVEL_3]: { tickets: 2, rollModifier: 0 },
  [FactionStandingLevel.LEVEL_4]: { tickets: 3, rollModifier: 0 },
  [FactionStandingLevel.LEVEL_5]: { tickets: 4, rollModifier: 1 },
  [FactionStandingLevel.LEVEL_6]: { tickets: 5, rollModifier: 2 },
  [FactionStandingLevel.LEVEL_7]: { tickets: 5, rollModifier: 2 },
  [FactionStandingLevel.LEVEL_8]: { tickets: 6, rollModifier: 3 },
};

/**
 * Barracks cost multiplier: 0.75 to 3.0
 * Affects daily housing/food costs
 */
const BARRACKS_COST_MULTIPLIER: Record<FactionStandingLevel, number> = {
  [FactionStandingLevel.LEVEL_0]: 3.0,
  [FactionStandingLevel.LEVEL_1]: 2.5,
  [FactionStandingLevel.LEVEL_2]: 2.0,
  [FactionStandingLevel.LEVEL_3]: 1.5,
  [FactionStandingLevel.LEVEL_4]: 1.0,
  [FactionStandingLevel.LEVEL_5]: 0.9,
  [FactionStandingLevel.LEVEL_6]: 0.85,
  [FactionStandingLevel.LEVEL_7]: 0.8,
  [FactionStandingLevel.LEVEL_8]: 0.75,
};

/**
 * Unit market rarity modifier: -2 to +3
 * Affects unit availability in market
 */
const UNIT_MARKET_RARITY_MODIFIER: Record<FactionStandingLevel, number> = {
  [FactionStandingLevel.LEVEL_0]: -2,
  [FactionStandingLevel.LEVEL_1]: -1,
  [FactionStandingLevel.LEVEL_2]: -1,
  [FactionStandingLevel.LEVEL_3]: 0,
  [FactionStandingLevel.LEVEL_4]: 0,
  [FactionStandingLevel.LEVEL_5]: 1,
  [FactionStandingLevel.LEVEL_6]: 2,
  [FactionStandingLevel.LEVEL_7]: 2,
  [FactionStandingLevel.LEVEL_8]: 3,
};

/**
 * Contract pay multiplier: 0.6 to 1.2
 * Affects payment for completed contracts
 */
const CONTRACT_PAY_MULTIPLIER: Record<FactionStandingLevel, number> = {
  [FactionStandingLevel.LEVEL_0]: 0.6,
  [FactionStandingLevel.LEVEL_1]: 0.7,
  [FactionStandingLevel.LEVEL_2]: 0.8,
  [FactionStandingLevel.LEVEL_3]: 0.9,
  [FactionStandingLevel.LEVEL_4]: 1.0,
  [FactionStandingLevel.LEVEL_5]: 1.05,
  [FactionStandingLevel.LEVEL_6]: 1.1,
  [FactionStandingLevel.LEVEL_7]: 1.15,
  [FactionStandingLevel.LEVEL_8]: 1.2,
};

/**
 * Start support points modifier: -3 to +3
 * Support points awarded at contract start
 */
const START_SUPPORT_POINTS_MODIFIER: Record<FactionStandingLevel, number> = {
  [FactionStandingLevel.LEVEL_0]: -3,
  [FactionStandingLevel.LEVEL_1]: -2,
  [FactionStandingLevel.LEVEL_2]: -1,
  [FactionStandingLevel.LEVEL_3]: -1,
  [FactionStandingLevel.LEVEL_4]: 0,
  [FactionStandingLevel.LEVEL_5]: 1,
  [FactionStandingLevel.LEVEL_6]: 2,
  [FactionStandingLevel.LEVEL_7]: 2,
  [FactionStandingLevel.LEVEL_8]: 3,
};

/**
 * Periodic support points modifier: -4 to +3
 * Support points awarded periodically during contract
 */
const PERIODIC_SUPPORT_POINTS_MODIFIER: Record<FactionStandingLevel, number> = {
  [FactionStandingLevel.LEVEL_0]: -4,
  [FactionStandingLevel.LEVEL_1]: -3,
  [FactionStandingLevel.LEVEL_2]: -2,
  [FactionStandingLevel.LEVEL_3]: -1,
  [FactionStandingLevel.LEVEL_4]: 0,
  [FactionStandingLevel.LEVEL_5]: 1,
  [FactionStandingLevel.LEVEL_6]: 2,
  [FactionStandingLevel.LEVEL_7]: 2,
  [FactionStandingLevel.LEVEL_8]: 3,
};

/**
 * Get negotiation modifier for a faction standing level
 * @param level The faction standing level
 * @returns Modifier value from -4 to +4
 */
export function getNegotiationModifier(level: FactionStandingLevel): number {
  return NEGOTIATION_MODIFIER[level];
}

/**
 * Get resupply weight modifier for a faction standing level
 * @param level The faction standing level
 * @returns Modifier value from 0.0 to 2.0
 */
export function getResupplyWeightModifier(level: FactionStandingLevel): number {
  return RESUPPLY_WEIGHT_MODIFIER[level];
}

/**
 * Check if command circuit access is available at this standing level
 * @param level The faction standing level
 * @returns True if Level 7+, false otherwise
 */
export function hasCommandCircuitAccess(level: FactionStandingLevel): boolean {
  return COMMAND_CIRCUIT_ACCESS[level];
}

/**
 * Check if the faction is outlawed at this standing level
 * @param level The faction standing level
 * @returns True if Level 0-1, false otherwise
 */
export function isOutlawed(level: FactionStandingLevel): boolean {
  return OUTLAWED_STATUS[level];
}

/**
 * Check if batchall (clan challenges) is disabled at this standing level
 * @param level The faction standing level
 * @returns True if Level 0-2, false otherwise
 */
export function isBatchallDisabled(level: FactionStandingLevel): boolean {
  return BATCHALL_DISABLED[level];
}

/**
 * Get recruitment modifier for a faction standing level
 * @param level The faction standing level
 * @returns Object with tickets (0-6) and rollModifier (-3 to +3)
 */
export function getRecruitmentModifier(
  level: FactionStandingLevel
): { tickets: number; rollModifier: number } {
  return RECRUITMENT_MODIFIER[level];
}

/**
 * Get barracks cost multiplier for a faction standing level
 * @param level The faction standing level
 * @returns Multiplier value from 0.75 to 3.0
 */
export function getBarracksCostMultiplier(level: FactionStandingLevel): number {
  return BARRACKS_COST_MULTIPLIER[level];
}

/**
 * Get unit market rarity modifier for a faction standing level
 * @param level The faction standing level
 * @returns Modifier value from -2 to +3
 */
export function getUnitMarketRarityModifier(
  level: FactionStandingLevel
): number {
  return UNIT_MARKET_RARITY_MODIFIER[level];
}

/**
 * Get contract pay multiplier for a faction standing level
 * @param level The faction standing level
 * @returns Multiplier value from 0.6 to 1.2
 */
export function getContractPayMultiplier(level: FactionStandingLevel): number {
  return CONTRACT_PAY_MULTIPLIER[level];
}

/**
 * Get start support points modifier for a faction standing level
 * @param level The faction standing level
 * @returns Modifier value from -3 to +3
 */
export function getStartSupportPointsModifier(
  level: FactionStandingLevel
): number {
  return START_SUPPORT_POINTS_MODIFIER[level];
}

/**
 * Get periodic support points modifier for a faction standing level
 * @param level The faction standing level
 * @returns Modifier value from -4 to +3
 */
export function getPeriodicSupportPointsModifier(
  level: FactionStandingLevel
): number {
  return PERIODIC_SUPPORT_POINTS_MODIFIER[level];
}

/**
 * Complete faction standing effects object
 */
export interface FactionStandingEffects {
  readonly negotiation: number;
  readonly resupplyWeight: number;
  readonly commandCircuit: boolean;
  readonly outlawed: boolean;
  readonly batchallDisabled: boolean;
  readonly recruitment: { tickets: number; rollModifier: number };
  readonly barracksCost: number;
  readonly unitMarketRarity: number;
  readonly contractPay: number;
  readonly startSupportPoints: number;
  readonly periodicSupportPoints: number;
}

/**
 * Get all faction standing effects for a given level
 * @param level The faction standing level
 * @returns Complete FactionStandingEffects object with all 11 effects
 */
export function getAllEffects(level: FactionStandingLevel): FactionStandingEffects {
  return {
    negotiation: getNegotiationModifier(level),
    resupplyWeight: getResupplyWeightModifier(level),
    commandCircuit: hasCommandCircuitAccess(level),
    outlawed: isOutlawed(level),
    batchallDisabled: isBatchallDisabled(level),
    recruitment: getRecruitmentModifier(level),
    barracksCost: getBarracksCostMultiplier(level),
    unitMarketRarity: getUnitMarketRarityModifier(level),
    contractPay: getContractPayMultiplier(level),
    startSupportPoints: getStartSupportPointsModifier(level),
    periodicSupportPoints: getPeriodicSupportPointsModifier(level),
  };
}
