/**
 * Ammo State Management
 * Initialization, consumption, availability checks, bin selection, totals, and queries.
 */

import {
  IAmmoSlotState,
  IAmmoConsumedPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IAmmoConstructionData, IAmmoConsumeResult } from './types';

/**
 * Initialize ammo bin state from unit construction data at game start.
 * Each ton of ammo becomes a separate bin.
 */
export function initializeAmmoState(
  constructionData: readonly IAmmoConstructionData[],
): Record<string, IAmmoSlotState> {
  const ammoState: Record<string, IAmmoSlotState> = {};

  for (const data of constructionData) {
    ammoState[data.binId] = {
      binId: data.binId,
      weaponType: data.weaponType,
      location: data.location,
      remainingRounds: data.maxRounds,
      maxRounds: data.maxRounds,
      isExplosive: data.isExplosive,
    };
  }

  return ammoState;
}

/**
 * Consume ammunition for a weapon firing.
 * Finds the first non-empty, non-destroyed bin matching the weapon type.
 */
export function consumeAmmo(
  ammoState: Record<string, IAmmoSlotState>,
  unitId: string,
  weaponType: string,
  rounds: number = 1,
): IAmmoConsumeResult | null {
  const bin = findAvailableAmmoBin(ammoState, weaponType);
  if (!bin) return null;

  const newRemainingRounds = Math.max(0, bin.remainingRounds - rounds);

  const updatedAmmoState: Record<string, IAmmoSlotState> = {
    ...ammoState,
    [bin.binId]: {
      ...bin,
      remainingRounds: newRemainingRounds,
    },
  };

  const event: IAmmoConsumedPayload = {
    unitId,
    binId: bin.binId,
    weaponType,
    roundsConsumed: rounds,
    roundsRemaining: newRemainingRounds,
  };

  return {
    updatedAmmoState,
    event,
    success: true,
  };
}

/**
 * Check if a weapon has ammo available to fire.
 * Energy weapons always return true (no ammo required).
 */
export function hasAmmoForWeapon(
  ammoState: Record<string, IAmmoSlotState>,
  weaponType: string,
  isEnergyWeapon: boolean = false,
): boolean {
  if (isEnergyWeapon) return true;
  return findAvailableAmmoBin(ammoState, weaponType) !== null;
}

/**
 * Find the first non-empty ammo bin matching a weapon type.
 */
function findAvailableAmmoBin(
  ammoState: Record<string, IAmmoSlotState>,
  weaponType: string,
): IAmmoSlotState | null {
  const bins = Object.values(ammoState);

  for (const bin of bins) {
    if (bin.weaponType === weaponType && bin.remainingRounds > 0) {
      return bin;
    }
  }

  return null;
}

/**
 * Get total remaining ammo for a weapon type across all bins.
 */
export function getTotalAmmo(
  ammoState: Record<string, IAmmoSlotState>,
  weaponType: string,
): number {
  return Object.values(ammoState)
    .filter((bin) => bin.weaponType === weaponType)
    .reduce((total, bin) => total + bin.remainingRounds, 0);
}

/**
 * Get all ammo bins at a specific location.
 */
export function getAmmoBinsAtLocation(
  ammoState: Record<string, IAmmoSlotState>,
  location: string,
): readonly IAmmoSlotState[] {
  return Object.values(ammoState).filter((bin) => bin.location === location);
}

/**
 * Select a random non-empty ammo bin for heat-induced explosion.
 */
export function selectRandomAmmoBin(
  ammoState: Record<string, IAmmoSlotState>,
  diceRoller: () => number,
): string | null {
  const nonEmptyBins = Object.values(ammoState).filter(
    (bin) => bin.remainingRounds > 0,
  );
  if (nonEmptyBins.length === 0) return null;

  const roll = diceRoller();
  const index = (roll - 1) % nonEmptyBins.length;
  return nonEmptyBins[index].binId;
}
