import { normalizeLocation } from './manifest';
import {
  CombatLocation,
  CriticalSlotManifest,
  ICriticalHitDeterminationResult,
  ICriticalSlotEntry,
} from './types';
import { D6Roller, roll2d6 } from '../hitLocation';

export function rollCriticalHits(
  location: CombatLocation,
  diceRoller: D6Roller,
): ICriticalHitDeterminationResult {
  const roll = roll2d6(diceRoller);

  if (roll.total <= 7) {
    return {
      roll,
      criticalHits: 0,
      limbBlownOff: false,
      headDestroyed: false,
    };
  }

  if (roll.total <= 9) {
    return {
      roll,
      criticalHits: 1,
      limbBlownOff: false,
      headDestroyed: false,
    };
  }

  if (roll.total <= 11) {
    return {
      roll,
      criticalHits: 2,
      limbBlownOff: false,
      headDestroyed: false,
    };
  }

  const isLimb =
    location === 'left_arm' ||
    location === 'right_arm' ||
    location === 'left_leg' ||
    location === 'right_leg';
  const isHead = location === 'head';

  if (isLimb) {
    return {
      roll,
      criticalHits: 0,
      limbBlownOff: true,
      headDestroyed: false,
    };
  }

  if (isHead) {
    return {
      roll,
      criticalHits: 0,
      limbBlownOff: false,
      headDestroyed: true,
    };
  }

  return {
    roll,
    criticalHits: 3,
    limbBlownOff: false,
    headDestroyed: false,
  };
}

export function selectCriticalSlot(
  manifest: CriticalSlotManifest,
  location: CombatLocation,
  diceRoller: D6Roller,
): ICriticalSlotEntry | null {
  const normalizedLocation = normalizeLocation(location);
  const slots = manifest[normalizedLocation];
  if (!slots || slots.length === 0) return null;

  const availableSlots = slots.filter((slot) => !slot.destroyed);
  if (availableSlots.length === 0) return null;

  const roll = diceRoller();
  const index = (roll - 1) % availableSlots.length;
  return availableSlots[index];
}
