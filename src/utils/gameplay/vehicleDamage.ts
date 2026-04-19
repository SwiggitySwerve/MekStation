/**
 * Vehicle Damage Module
 *
 * Implements the vehicle armor → structure transfer chain and the
 * orchestration entry point `vehicleResolveDamage`. Unlike mechs, vehicles:
 *   - Do NOT transfer damage to an adjacent location (single chassis).
 *   - Trigger a motive-damage roll when damage exposes structure at a
 *     Front/Side/Rear location (per motion type — Hover rolls on any hit).
 *   - Trigger a crit on TAC rolls (2 / 12) or structure-exposing damage.
 *   - Are destroyed when any primary chassis location's structure reaches 0.
 *     Turret destruction does NOT destroy the vehicle; Rotor destruction on a
 *     VTOL immobilizes it and triggers a crash.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 */

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import {
  IMotiveDamageRollResult,
  IVehicleCombatState,
  IVehicleHitLocationResult,
  IVehicleLocationDamage,
  IVehicleResolveDamageResult,
  VehicleHitLocation,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { D6Roller, defaultD6Roller } from './diceTypes';
import {
  applyMotionTypeAggravation,
  applyMotiveDamageToState,
  requiresMotiveRollOnAnyHit,
  rollMotiveDamage,
} from './motiveDamage';

// =============================================================================
// Hit Location → Vehicle Location mapping
// =============================================================================

/**
 * Map a hit-location table result onto a `VehicleLocation` / `VTOLLocation`.
 */
export function vehicleHitLocationToArmorKey(
  location: VehicleHitLocation,
): VehicleLocation | VTOLLocation {
  switch (location) {
    case 'front':
      return VehicleLocation.FRONT;
    case 'left_side':
      return VehicleLocation.LEFT;
    case 'right_side':
      return VehicleLocation.RIGHT;
    case 'rear':
      return VehicleLocation.REAR;
    case 'turret':
      return VehicleLocation.TURRET;
    case 'rotor':
      return VTOLLocation.ROTOR;
  }
}

/**
 * Front / Left / Right / Rear — i.e. locations where a structure-exposing
 * hit triggers a motive-damage roll (spec: "damage exposes structure at a
 * vehicle's Front, Side, or Rear location").
 */
export function isMotiveStructureLocation(
  location: VehicleLocation | VTOLLocation,
): boolean {
  return (
    location === VehicleLocation.FRONT ||
    location === VehicleLocation.LEFT ||
    location === VehicleLocation.RIGHT ||
    location === VehicleLocation.REAR
  );
}

/**
 * Which locations, when destroyed, destroy the entire vehicle.
 * Turret destruction does NOT destroy the vehicle (only the turret).
 * Rotor destruction is handled separately (immobilizes + crash).
 * Body destruction is engine/crew — counts as vehicle destroyed.
 */
function isFatalLocation(location: VehicleLocation | VTOLLocation): boolean {
  return (
    location === VehicleLocation.FRONT ||
    location === VehicleLocation.LEFT ||
    location === VehicleLocation.RIGHT ||
    location === VehicleLocation.REAR ||
    location === VehicleLocation.BODY
  );
}

// =============================================================================
// Location Damage Application
// =============================================================================

/**
 * Apply `damage` to a vehicle location's armor then structure. No transfer to
 * adjacent locations. Returns the updated state + per-location result.
 */
export function applyVehicleDamageToLocation(
  state: IVehicleCombatState,
  location: VehicleLocation | VTOLLocation,
  damage: number,
): { state: IVehicleCombatState; result: IVehicleLocationDamage } {
  const alreadyDestroyed = state.destroyedLocations.includes(location);
  if (alreadyDestroyed || damage <= 0) {
    return {
      state,
      result: {
        location,
        damage,
        armorDamage: 0,
        structureDamage: 0,
        armorRemaining: (state.armor as Record<string, number>)[location] ?? 0,
        structureRemaining:
          (state.structure as Record<string, number>)[location] ?? 0,
        destroyed: alreadyDestroyed,
        structureExposed: false,
      },
    };
  }

  const armorBag = state.armor as Record<string, number>;
  const structureBag = state.structure as Record<string, number>;
  const currentArmor = armorBag[location] ?? 0;
  const currentStructure = structureBag[location] ?? 0;

  let remaining = damage;
  let armorDamage = 0;
  let structureDamage = 0;
  let structureExposed = false;
  let destroyed = false;

  const newArmor: Record<string, number> = { ...armorBag };
  const newStructure: Record<string, number> = { ...structureBag };
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
    if (newStructure[location] <= 0) {
      destroyed = true;
      newDestroyedLocations = [...newDestroyedLocations, location];
    }
  }

  const newState: IVehicleCombatState = {
    ...state,
    armor: newArmor as IVehicleCombatState['armor'],
    structure: newStructure as IVehicleCombatState['structure'],
    destroyedLocations: newDestroyedLocations,
  };

  return {
    state: newState,
    result: {
      location,
      damage,
      armorDamage,
      structureDamage,
      armorRemaining: newArmor[location] ?? 0,
      structureRemaining: newStructure[location] ?? 0,
      destroyed,
      structureExposed,
    },
  };
}

// =============================================================================
// Destruction Check
// =============================================================================

/**
 * After a location is destroyed, determine whether the whole vehicle is dead.
 */
function checkVehicleDestruction(
  state: IVehicleCombatState,
  justDestroyed: VehicleLocation | VTOLLocation | null,
): {
  state: IVehicleCombatState;
  destroyed: boolean;
  cause?: IVehicleCombatState['destructionCause'];
} {
  if (state.destroyed) {
    return { state, destroyed: true, cause: state.destructionCause };
  }

  if (justDestroyed && isFatalLocation(justDestroyed)) {
    const newState: IVehicleCombatState = {
      ...state,
      destroyed: true,
      destructionCause: 'damage',
    };
    return { state: newState, destroyed: true, cause: 'damage' };
  }

  if (state.motive.immobilized && !state.destroyed) {
    // Immobilized is not destruction by itself — the unit remains salvageable.
    return { state, destroyed: false };
  }

  return { state, destroyed: false };
}

// =============================================================================
// Damage Resolution Orchestrator
// =============================================================================

export interface IVehicleResolveDamageOptions {
  /**
   * The 2d6 dice roller used to drive any motive-damage rolls this
   * resolution triggers. Test code injects a deterministic roller.
   */
  readonly diceRoller?: D6Roller;
  /**
   * Force a specific motive-damage roll (for deterministic tests). When
   * provided, no dice are rolled.
   */
  readonly forcedMotiveRoll?: IMotiveDamageRollResult;
  /**
   * True when a motive roll should be made regardless of structure-exposure.
   * (Override for edge cases; normally derived from motion type.)
   */
  readonly forceMotiveRoll?: boolean;
}

/**
 * Apply damage to a vehicle's hit location and resolve downstream effects:
 *   - Armor / structure transfer (no adjacent-location transfer).
 *   - Motive-damage roll if structure exposed OR motion type is Hover-class.
 *   - Rotor destruction flag (caller triggers VTOL crash separately).
 *   - Destruction check (fatal location destroyed → vehicle destroyed).
 *
 * Note: critical hits are handled by `vehicleResolveCriticalHits` — callers
 * use `IVehicleResolveDamageResult.locationDamages[].structureExposed` and
 * the incoming `IVehicleHitLocationResult.isTAC` to decide whether to invoke
 * the crit pipeline.
 */
export function vehicleResolveDamage(
  state: IVehicleCombatState,
  hit: IVehicleHitLocationResult,
  damage: number,
  options: IVehicleResolveDamageOptions = {},
): IVehicleResolveDamageResult {
  const diceRoller = options.diceRoller ?? defaultD6Roller;
  const armorKey = vehicleHitLocationToArmorKey(hit.location);

  const { state: stateAfter, result } = applyVehicleDamageToLocation(
    state,
    armorKey,
    damage,
  );

  // Decide if we need a motive-damage roll. Per spec:
  //   - Structure-exposing damage at Front/Side/Rear always triggers.
  //   - Hover / Hydrofoil / Naval trigger on ANY hit at Front/Side/Rear.
  const atMotiveLoc = isMotiveStructureLocation(armorKey);
  const motiveTriggered =
    atMotiveLoc &&
    (result.structureExposed ||
      requiresMotiveRollOnAnyHit(stateAfter.motionType) ||
      options.forceMotiveRoll === true);

  let motiveRoll: IMotiveDamageRollResult | undefined;
  let stateWithMotive = stateAfter;

  if (motiveTriggered && damage > 0) {
    const raw = options.forcedMotiveRoll ?? rollMotiveDamage(diceRoller);
    motiveRoll = applyMotionTypeAggravation(raw, stateAfter.motionType);

    stateWithMotive = {
      ...stateAfter,
      motive: applyMotiveDamageToState(stateAfter.motive, motiveRoll),
    };

    // Hover "heavy" aggravated to immobilized; Naval "heavy" sets sinking.
    if (
      motiveRoll.severity === 'heavy' &&
      (stateAfter.motionType === GroundMotionType.NAVAL ||
        stateAfter.motionType === GroundMotionType.HYDROFOIL ||
        stateAfter.motionType === GroundMotionType.SUBMARINE)
    ) {
      stateWithMotive = {
        ...stateWithMotive,
        motive: { ...stateWithMotive.motive, sinking: true },
      };
    }
  }

  // Rotor destruction → crash check + immobilize (VTOL).
  const crashCheckTriggered =
    armorKey === VTOLLocation.ROTOR &&
    (result.structureDamage > 0 || result.destroyed);
  if (crashCheckTriggered) {
    stateWithMotive = {
      ...stateWithMotive,
      motive: { ...stateWithMotive.motive, immobilized: true },
    };
  }

  // Destruction check (fatal location → vehicle destroyed).
  const {
    state: finalState,
    destroyed,
    cause,
  } = checkVehicleDestruction(
    stateWithMotive,
    result.destroyed ? armorKey : null,
  );

  // Immobilization-by-motive-roll doesn't destroy the vehicle by itself
  // (task 3.4 / spec scenario "Motive table outcomes"), but the caller may
  // mark it immobilized for salvage purposes. Hover + "heavy"/immobilized
  // over water is a terrain concern and is handled by the caller; we only
  // flag immobilization here.

  return {
    state: finalState,
    locationDamages: [result],
    motiveRoll,
    critRoll: undefined,
    crashCheckTriggered,
    unitDestroyed: destroyed,
    destructionCause: destroyed ? cause : undefined,
  };
}

// =============================================================================
// State Constructors
// =============================================================================

/**
 * Create an initial combat state for a ground vehicle.
 */
export function createVehicleCombatState(params: {
  readonly unitId: string;
  readonly motionType: GroundMotionType;
  readonly originalCruiseMP: number;
  readonly armor: Partial<Record<VehicleLocation | VTOLLocation, number>>;
  readonly structure: Partial<Record<VehicleLocation | VTOLLocation, number>>;
  readonly altitude?: number;
}): IVehicleCombatState {
  return {
    unitId: params.unitId,
    motionType: params.motionType,
    armor: { ...params.armor },
    structure: { ...params.structure },
    destroyedLocations: [],
    motive: {
      originalCruiseMP: params.originalCruiseMP,
      penaltyMP: 0,
      immobilized: false,
      sinking: false,
      turretLocked: false,
      engineHits: 0,
      driverHits: 0,
      commanderHits: 0,
      crewStunnedPhases: 0,
    },
    turretLock: { primaryLocked: false, secondaryLocked: false },
    altitude: params.altitude,
    destroyed: false,
  };
}
