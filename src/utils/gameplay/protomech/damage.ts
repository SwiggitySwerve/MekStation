/**
 * ProtoMech Damage Module
 *
 * Implements the proto armor → structure pipeline and the orchestration entry
 * point `protoMechResolveDamage`. Unlike mechs, protos:
 *   - Have per-location armor AND structure but NO cross-location transfer.
 *   - Excess damage after structure destruction is discarded.
 *   - Torso or Head destruction destroys the proto.
 *   - MainGun destruction removes the main gun weapon but proto survives.
 *   - Leg destruction (Legs or both FrontLegs/RearLegs for quads) immobilizes
 *     but proto may still fire from other locations.
 *   - Glider protos trigger a fall-check on any structure-exposing hit while
 *     airborne (handled by the glider module, orchestrated here).
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement protomech-damage-chain
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §4
 */

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import type { IProtoHitLocationResult } from './hitLocation';
import type { IProtoMechCombatState } from './state';

import { ProtoEvent, ProtoEventType } from './events';

// =============================================================================
// Per-location damage result
// =============================================================================

/**
 * Outcome of damage application to a single proto location.
 */
export interface IProtoLocationDamage {
  readonly location: ProtoLocation;
  readonly damage: number;
  readonly armorDamage: number;
  readonly structureDamage: number;
  readonly armorRemaining: number;
  readonly structureRemaining: number;
  readonly destroyed: boolean;
  /** True when damage broke past armor into structure. */
  readonly structureExposed: boolean;
  /** Excess damage that was discarded (no transfer to other locations). */
  readonly excessDiscarded: number;
}

// =============================================================================
// Aggregate damage result
// =============================================================================

export interface IProtoResolveDamageResult {
  readonly state: IProtoMechCombatState;
  readonly locationDamage: IProtoLocationDamage;
  /** Events emitted (location destroyed, main-gun removed, unit destroyed, ...). */
  readonly events: readonly ProtoEvent[];
  /** True if this resolution destroyed the proto. */
  readonly unitDestroyed: boolean;
}

// =============================================================================
// Destruction rules
// =============================================================================

/**
 * Which locations destroy the entire proto when reduced to 0 structure.
 * Head and Torso are fatal; MainGun / arms / legs are not.
 */
function isFatalProtoLocation(location: ProtoLocation): boolean {
  return location === ProtoLocation.HEAD || location === ProtoLocation.TORSO;
}

/**
 * True for any proto location whose destruction immobilizes the unit.
 * Biped/Glider/Ultraheavy: LEGS; Quad: the pair {FRONT_LEGS, REAR_LEGS} must
 * both be gone (the caller tracks multi-location immobilization).
 */
function isLegLocation(location: ProtoLocation): boolean {
  return (
    location === ProtoLocation.LEGS ||
    location === ProtoLocation.FRONT_LEGS ||
    location === ProtoLocation.REAR_LEGS
  );
}

// =============================================================================
// Per-location damage application
// =============================================================================

/**
 * Apply `damage` to a proto location's armor then structure. No transfer to
 * adjacent locations — excess is discarded.
 */
export function applyProtoDamageToLocation(
  state: IProtoMechCombatState,
  location: ProtoLocation,
  damage: number,
): { state: IProtoMechCombatState; result: IProtoLocationDamage } {
  const alreadyDestroyed = state.destroyedLocations.includes(location);
  if (alreadyDestroyed || damage <= 0) {
    return {
      state,
      result: {
        location,
        damage,
        armorDamage: 0,
        structureDamage: 0,
        armorRemaining: state.armorByLocation[location] ?? 0,
        structureRemaining: state.structureByLocation[location] ?? 0,
        destroyed: alreadyDestroyed,
        structureExposed: false,
        excessDiscarded: alreadyDestroyed ? damage : 0,
      },
    };
  }

  const currentArmor = state.armorByLocation[location] ?? 0;
  const currentStructure = state.structureByLocation[location] ?? 0;

  let remaining = damage;
  let armorDamage = 0;
  let structureDamage = 0;
  let structureExposed = false;
  let destroyed = false;

  const newArmor = { ...state.armorByLocation };
  const newStructure = { ...state.structureByLocation };
  let newDestroyedLocations = state.destroyedLocations;

  if (currentArmor > 0) {
    armorDamage = Math.min(currentArmor, remaining);
    remaining -= armorDamage;
    newArmor[location] = currentArmor - armorDamage;
  }

  if (remaining > 0 && currentStructure > 0) {
    structureDamage = Math.min(currentStructure, remaining);
    remaining -= structureDamage;
    newStructure[location] = currentStructure - structureDamage;
    structureExposed = true;
    if ((newStructure[location] ?? 0) <= 0) {
      destroyed = true;
      newDestroyedLocations = [...newDestroyedLocations, location];
    }
  } else if (remaining > 0 && currentStructure === 0) {
    // Armor absent but structure also 0 — already destroyed edge case.
    destroyed = true;
    if (!newDestroyedLocations.includes(location)) {
      newDestroyedLocations = [...newDestroyedLocations, location];
    }
  }

  // Excess (no transfer to adjacent — discarded).
  const excessDiscarded = remaining > 0 ? remaining : 0;

  const nextState: IProtoMechCombatState = {
    ...state,
    armorByLocation: newArmor,
    structureByLocation: newStructure,
    destroyedLocations: newDestroyedLocations,
  };

  return {
    state: nextState,
    result: {
      location,
      damage,
      armorDamage,
      structureDamage,
      armorRemaining: newArmor[location] ?? 0,
      structureRemaining: newStructure[location] ?? 0,
      destroyed,
      structureExposed,
      excessDiscarded,
    },
  };
}

// =============================================================================
// Post-destruction side effects
// =============================================================================

/**
 * Given a proto state with a just-destroyed location, apply the side effects:
 *   - MainGun destroyed → mainGunRemoved = true, emit `ProtoMainGunRemoved`
 *   - Head/Torso destroyed → proto destroyed, emit `ProtoUnitDestroyed`
 *   - Legs (Biped) / both FrontLegs+RearLegs (Quad) destroyed → immobilized
 *
 * Returns the updated state and any additional events to append.
 */
export function applyProtoDestructionSideEffects(
  state: IProtoMechCombatState,
  destroyedLocation: ProtoLocation,
): { state: IProtoMechCombatState; events: readonly ProtoEvent[] } {
  const events: ProtoEvent[] = [];
  let next: IProtoMechCombatState = state;

  // Location-destroyed event always fires for any destruction.
  events.push({
    type: ProtoEventType.PROTO_LOCATION_DESTROYED,
    unitId: state.unitId,
    location: destroyedLocation,
  });

  // Main gun removal.
  if (destroyedLocation === ProtoLocation.MAIN_GUN && !next.mainGunRemoved) {
    next = { ...next, mainGunRemoved: true };
    events.push({
      type: ProtoEventType.PROTO_MAIN_GUN_REMOVED,
      unitId: state.unitId,
    });
  }

  // Leg destruction → immobilize. For Biped/Glider/Ultraheavy a single LEGS
  // destruction immobilizes. For Quad, the unit is only immobilized once BOTH
  // leg groups are gone.
  if (isLegLocation(destroyedLocation) && !next.immobilized) {
    const isQuad = state.chassisType === ProtoChassis.QUAD;
    if (!isQuad) {
      next = { ...next, immobilized: true };
    } else {
      const frontGone = next.destroyedLocations.includes(
        ProtoLocation.FRONT_LEGS,
      );
      const rearGone = next.destroyedLocations.includes(
        ProtoLocation.REAR_LEGS,
      );
      if (frontGone && rearGone) {
        next = { ...next, immobilized: true };
      }
    }
  }

  // Fatal-location destruction destroys the whole proto.
  if (isFatalProtoLocation(destroyedLocation) && !next.destroyed) {
    const cause =
      destroyedLocation === ProtoLocation.HEAD
        ? 'head_destroyed'
        : 'torso_destroyed';
    next = {
      ...next,
      destroyed: true,
      destructionCause: cause,
    };
    events.push({
      type: ProtoEventType.PROTO_UNIT_DESTROYED,
      unitId: state.unitId,
      cause,
    });
  }

  return { state: next, events };
}

// =============================================================================
// Damage-resolution orchestrator
// =============================================================================

export interface IProtoResolveDamageOptions {
  /** Override for the resolved location (skip hit-location lookup — used by
   *  direct / scripted damage, e.g. fall damage). */
  readonly forcedLocation?: ProtoLocation;
}

/**
 * Apply damage to a proto target. Uses the pre-computed hit-location result
 * to pick the slot, maps that slot to a `ProtoLocation`, and runs the
 * armor → structure chain with no cross-location transfer.
 *
 * Glider fall-check and crit triggering are NOT performed here — the caller
 * orchestrates those based on `locationDamage.structureExposed`.
 */
export function protoMechResolveDamage(
  state: IProtoMechCombatState,
  hit: IProtoHitLocationResult,
  damage: number,
  options: IProtoResolveDamageOptions = {},
): IProtoResolveDamageResult {
  const location = options.forcedLocation ?? hit.location;

  const { state: stateAfter, result } = applyProtoDamageToLocation(
    state,
    location,
    damage,
  );

  const events: ProtoEvent[] = [];
  let finalState = stateAfter;

  if (result.destroyed) {
    const { state: next, events: sideEvents } =
      applyProtoDestructionSideEffects(stateAfter, location);
    finalState = next;
    for (const e of sideEvents) events.push(e);
  }

  return {
    state: finalState,
    locationDamage: result,
    events,
    unitDestroyed: finalState.destroyed,
  };
}
