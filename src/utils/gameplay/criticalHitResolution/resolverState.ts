import { CriticalEffectType } from '@/types/gameplay';

import { normalizeLocation } from './manifest';
import {
  CombatLocation,
  CriticalHitEvent,
  CriticalSlotManifest,
  IComponentDamageState,
  ICriticalEdgeOptions,
  ICriticalHitApplicationResult,
  ICriticalResolutionResult,
  ICriticalSlotEntry,
} from './types';

type DestructionCause = 'engine_destroyed' | 'pilot_death';

export interface ICriticalResolutionState {
  readonly hits: ICriticalHitApplicationResult[];
  readonly allEvents: CriticalHitEvent[];
  currentDamage: IComponentDamageState;
  currentManifest: CriticalSlotManifest;
  currentEdgePointsRemaining?: number;
  unitDestroyed: boolean;
  destructionCause?: DestructionCause;
}

export function createResolutionState(options: {
  readonly manifest: CriticalSlotManifest;
  readonly componentDamage: IComponentDamageState;
  readonly edgeOptions: ICriticalEdgeOptions;
}): ICriticalResolutionState {
  return {
    hits: [],
    allEvents: [],
    currentDamage: options.componentDamage,
    currentManifest: { ...options.manifest },
    currentEdgePointsRemaining: options.edgeOptions.edgePointsRemaining,
    unitDestroyed: false,
  };
}

export function applyCriticalResultToState(
  state: ICriticalResolutionState,
  result: ICriticalHitApplicationResult,
  edgePointsAfterSelection?: number,
): void {
  state.hits.push(result);
  state.allEvents.push(
    ...applyEdgePointsToEvents(result, edgePointsAfterSelection),
  );
  state.currentDamage = result.updatedComponentDamage;
  trackDestructionEvents(state, result.events);
}

export function markResolvedSlotDestroyed(
  manifest: CriticalSlotManifest,
  location: CombatLocation,
  slot: ICriticalSlotEntry,
  result: ICriticalHitApplicationResult,
): CriticalSlotManifest {
  const linkedCriticalWeaponId = getLinkedCriticalWeaponId(result);
  const slotDestroyed = result.slotDestroyed !== false;
  return updateLocationSlots(manifest, location, (candidate) =>
    candidate.slotIndex === slot.slotIndex ||
    (linkedCriticalWeaponId !== undefined &&
      candidate.weaponId === linkedCriticalWeaponId)
      ? { ...candidate, destroyed: slotDestroyed }
      : candidate,
  );
}

export function markLocationSlotsDestroyed(
  manifest: CriticalSlotManifest,
  location: CombatLocation,
): CriticalSlotManifest {
  return updateLocationSlots(manifest, location, (slot) => ({
    ...slot,
    destroyed: true,
  }));
}

export function getSlotsForLocation(
  manifest: CriticalSlotManifest,
  location: CombatLocation,
): readonly ICriticalSlotEntry[] {
  return manifest[normalizeLocation(location)] ?? [];
}

export function isSlotCriticalEffectCandidate(
  slot: ICriticalSlotEntry,
): boolean {
  return !slot.destroyed && slot.missing !== true && slot.breached !== true;
}

export function createResolutionResult(
  state: ICriticalResolutionState,
  flags: {
    readonly locationBlownOff: boolean;
    readonly headDestroyed: boolean;
  },
): ICriticalResolutionResult {
  return {
    hits: state.hits,
    events: state.allEvents,
    updatedManifest: state.currentManifest,
    updatedComponentDamage: state.currentDamage,
    edgePointsRemaining: state.currentEdgePointsRemaining,
    locationBlownOff: flags.locationBlownOff,
    headDestroyed: flags.headDestroyed,
    unitDestroyed: state.unitDestroyed,
    destructionCause: state.destructionCause,
  };
}

function applyEdgePointsToEvents(
  result: ICriticalHitApplicationResult,
  edgePointsAfterSelection?: number,
): readonly CriticalHitEvent[] {
  if (edgePointsAfterSelection === undefined) {
    return result.events;
  }

  return result.events.map((event) =>
    event.type === 'critical_hit_resolved'
      ? {
          ...event,
          payload: {
            ...event.payload,
            edgePointsRemaining: edgePointsAfterSelection,
          },
        }
      : event,
  );
}

function trackDestructionEvents(
  state: ICriticalResolutionState,
  events: readonly CriticalHitEvent[],
): void {
  if (events.some(isDamageDestructionEvent)) {
    state.unitDestroyed = true;
    state.destructionCause = 'engine_destroyed';
  }
  if (events.some(isPilotDeathDestructionEvent)) {
    state.unitDestroyed = true;
    state.destructionCause = 'pilot_death';
  }
}

function isDamageDestructionEvent(event: CriticalHitEvent): boolean {
  return event.type === 'unit_destroyed' && event.payload.cause === 'damage';
}

function isPilotDeathDestructionEvent(event: CriticalHitEvent): boolean {
  return (
    event.type === 'unit_destroyed' && event.payload.cause === 'pilot_death'
  );
}

function getLinkedCriticalWeaponId(
  result: ICriticalHitApplicationResult,
): string | undefined {
  if (result.effect.type !== CriticalEffectType.WeaponDestroyed) {
    return undefined;
  }

  return result.events.find((event) => event.type === 'critical_hit_resolved')
    ?.payload.linkedCriticalWeaponId;
}

function updateLocationSlots(
  manifest: CriticalSlotManifest,
  location: CombatLocation,
  update: (slot: ICriticalSlotEntry) => ICriticalSlotEntry,
): CriticalSlotManifest {
  const normalizedLoc = normalizeLocation(location);
  const slots = manifest[normalizedLoc] ?? [];
  return {
    ...manifest,
    [normalizedLoc]: slots.map(update),
  };
}
