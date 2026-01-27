/**
 * Variable Contract Length Calculation
 *
 * Calculates variable contract durations using the MekHQ AtB formula:
 * actualLength = round(constantLength × 0.75) + randomInt(round(constantLength × 0.5))
 *
 * @module campaign/contracts/contractLength
 */

import { AtBContractType, CONTRACT_TYPE_DEFINITIONS } from '@/types/campaign/contracts/contractTypes';

/** Random number generator function type. Returns [0, 1). */
export type RandomFn = () => number;

/**
 * Calculate variable contract length in months using MekHQ formula.
 * Formula: round(constantLength × 0.75) + floor(random() × round(constantLength × 0.5))
 *
 * @param contractType - The AtB contract type
 * @param random - Injectable random function for testability
 * @returns Contract length in months
 */
export function calculateContractLength(
  contractType: AtBContractType,
  random: RandomFn
): number {
  const def = CONTRACT_TYPE_DEFINITIONS[contractType];
  const base = def.durationMonths;
  const minLength = Math.round(base * 0.75);
  const variance = Math.round(base * 0.5);
  if (variance === 0) return minLength;
  const roll = Math.floor(random() * variance);
  return minLength + roll;
}

/**
 * Convert months to days (simplified 30-day months).
 * @param months - Number of months
 * @returns Number of days
 */
export function contractLengthToDays(months: number): number {
  return months * 30;
}

/**
 * Get the valid range of contract lengths for a given type.
 * @param contractType - The AtB contract type
 * @returns Object with min and max months
 */
export function getContractLengthRange(contractType: AtBContractType): { min: number; max: number } {
  const def = CONTRACT_TYPE_DEFINITIONS[contractType];
  const base = def.durationMonths;
  const minLength = Math.round(base * 0.75);
  const variance = Math.round(base * 0.5);
  return { min: minLength, max: minLength + Math.max(0, variance - 1) };
}
