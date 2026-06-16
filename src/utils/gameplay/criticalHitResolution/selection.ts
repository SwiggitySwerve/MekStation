import { D6Roller, roll2d6 } from '../hitLocation';
import { createEdgeState, resolveEdgeBattleMechTrigger } from '../spaModifiers';
import { normalizeLocation } from './manifest';
import {
  CombatLocation,
  CriticalSlotManifest,
  ICriticalEdgeOptions,
  ICriticalHitDeterminationResult,
  ICriticalSlotEntry,
} from './types';

const CRITICAL_EXPLOSION_EDGE_TRIGGER = 'edge_when_explosion' as const;

interface ICriticalSlotSelectionResult {
  readonly slot: ICriticalSlotEntry | null;
  readonly edgePointsRemaining?: number;
}

export function rollCriticalHits(
  location: CombatLocation,
  diceRoller: D6Roller,
  modifier = 0,
): ICriticalHitDeterminationResult {
  const roll = roll2d6(diceRoller);
  const modifiedTotal = roll.total + modifier;

  if (modifiedTotal <= 7) {
    return {
      roll,
      criticalHits: 0,
      limbBlownOff: false,
      headDestroyed: false,
    };
  }

  if (modifiedTotal <= 9) {
    return {
      roll,
      criticalHits: 1,
      limbBlownOff: false,
      headDestroyed: false,
    };
  }

  if (modifiedTotal <= 11) {
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
  return selectCriticalSlotWithEdge(manifest, location, diceRoller).slot;
}

export function selectCriticalSlotWithEdge(
  manifest: CriticalSlotManifest,
  location: CombatLocation,
  diceRoller: D6Roller,
  edgeOptions: ICriticalEdgeOptions = {},
): ICriticalSlotSelectionResult {
  const normalizedLocation = normalizeLocation(location);
  const slots = manifest[normalizedLocation];
  if (!slots || slots.length === 0) return { slot: null };

  const availableSlots = slots.filter((slot) => isCriticalSlotAvailable(slot));
  if (availableSlots.length === 0) return { slot: null };

  const roll = diceRoller();
  const firstSlot = selectSlotFromPool(availableSlots, roll);
  if (!isExplosiveCriticalSlot(firstSlot)) {
    return { slot: firstSlot };
  }

  const nonExplosiveSlots = availableSlots.filter(
    (slot) => !isExplosiveCriticalSlot(slot),
  );
  if (nonExplosiveSlots.length === 0) {
    return { slot: firstSlot };
  }

  const edgePointsRemaining = edgeOptions.edgePointsRemaining ?? 0;
  const edgeResolution = resolveEdgeBattleMechTrigger({
    trigger: CRITICAL_EXPLOSION_EDGE_TRIGGER,
    edgeState:
      edgePointsRemaining > 0
        ? createEdgeState(edgePointsRemaining)
        : undefined,
    pilotAbilities: edgeOptions.pilotAbilities ?? [],
    shouldTrigger: true,
    turn: edgeOptions.turn ?? 0,
    unitId: edgeOptions.unitId ?? 'unknown-unit',
    description: `Critical explosion slot reroll: ${firstSlot.componentName}`,
  });

  if (!edgeResolution.used) {
    return { slot: firstSlot };
  }

  const reroll = diceRoller();
  return {
    slot: selectSlotFromPool(nonExplosiveSlots, reroll),
    edgePointsRemaining: edgeResolution.edgePointsRemaining,
  };
}

function selectSlotFromPool(
  slots: readonly ICriticalSlotEntry[],
  roll: number,
): ICriticalSlotEntry {
  const index = (roll - 1) % slots.length;
  return slots[index];
}

function isExplosiveCriticalSlot(slot: ICriticalSlotEntry): boolean {
  return (
    slot.componentType === 'ammo' ||
    (slot.explosionDamage !== undefined && slot.explosionDamage > 0)
  );
}

function isCriticalSlotAvailable(slot: ICriticalSlotEntry): boolean {
  return !slot.destroyed && slot.missing !== true && slot.breached !== true;
}
