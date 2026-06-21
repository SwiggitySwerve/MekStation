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

  if (!slots.some(isCriticalSlotAvailable)) return { slot: null };

  const firstSlot = selectSlotFromLocation(
    slots,
    diceRoller,
    isCriticalSlotAvailable,
  );
  if (!firstSlot) return { slot: null };
  if (!isExplosiveCriticalSlot(firstSlot)) {
    return { slot: firstSlot };
  }

  const nonExplosiveAvailable = (slot: ICriticalSlotEntry) =>
    isCriticalSlotAvailable(slot) && !isExplosiveCriticalSlot(slot);
  if (!slots.some(nonExplosiveAvailable)) {
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

  return {
    slot:
      selectSlotFromLocation(slots, diceRoller, nonExplosiveAvailable) ??
      firstSlot,
    edgePointsRemaining: edgeResolution.edgePointsRemaining,
  };
}

function selectSlotFromLocation(
  slots: readonly ICriticalSlotEntry[],
  diceRoller: D6Roller,
  isCandidate: (slot: ICriticalSlotEntry) => boolean,
): ICriticalSlotEntry | null {
  if (slots.length === 0) return null;

  const fairBucketSize = Math.floor(36 / slots.length) * slots.length;
  const maxAttempts = Math.max(72, slots.length * 12);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rollValue = rollUniformD6PairValue(diceRoller);
    if (fairBucketSize > 0 && rollValue >= fairBucketSize) {
      continue;
    }

    const index = rollValue % slots.length;
    const slot = slots[index];
    if (isCandidate(slot)) {
      return slot;
    }
  }

  return slots.find(isCandidate) ?? null;
}

function rollUniformD6PairValue(diceRoller: D6Roller): number {
  const first = normalizeD6(diceRoller());
  const second = normalizeD6(diceRoller());
  return (first - 1) * 6 + (second - 1);
}

function normalizeD6(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(6, Math.trunc(value)));
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
