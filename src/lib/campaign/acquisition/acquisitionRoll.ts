/**
 * Acquisition Roll Calculator
 *
 * Core mechanics for acquisition rolls:
 * - Target number calculation with modifier stacking
 * - 2d6 roll generation with injectable random for testing
 * - Complete acquisition roll with success/failure determination
 */

import {
  AvailabilityRating,
  REGULAR_PART_TN,
  CONSUMABLE_TN,
  type IAcquisitionResult,
} from '@/types/campaign/acquisition/acquisitionTypes';

export type RandomFn = () => number;

export interface IAcquisitionModifier {
  readonly name: string;
  readonly value: number;
}

export function calculateAcquisitionTN(
  availability: AvailabilityRating,
  isConsumable: boolean,
  modifiers: readonly IAcquisitionModifier[]
): number {
  const baseTN = isConsumable
    ? CONSUMABLE_TN[availability]
    : REGULAR_PART_TN[availability];
  const totalMod = modifiers.reduce((sum, m) => sum + m.value, 0);
  return baseTN + totalMod;
}

export function roll2d6(random: RandomFn = Math.random): number {
  const die1 = Math.floor(random() * 6) + 1;
  const die2 = Math.floor(random() * 6) + 1;
  return die1 + die2;
}

export function performAcquisitionRoll(
  requestId: string,
  availability: AvailabilityRating,
  isConsumable: boolean,
  modifiers: readonly IAcquisitionModifier[],
  random: RandomFn = Math.random
): IAcquisitionResult {
  const targetNumber = calculateAcquisitionTN(
    availability,
    isConsumable,
    modifiers
  );
  const roll = roll2d6(random);
  const margin = roll - targetNumber;
  const success = roll >= targetNumber;

  return {
    requestId,
    success,
    roll,
    targetNumber,
    margin,
    transitDays: 0,
    modifiers,
  };
}
