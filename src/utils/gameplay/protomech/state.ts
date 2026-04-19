/**
 * ProtoMech Combat State
 *
 * Per-unit combat state for ProtoMechs. Kept separate from construction
 * `IProtoMechUnit` to avoid mutating canonical construction data — this
 * struct is owned by the combat engine and updated by the proto damage
 * pipeline.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/protomech-unit-system/spec.md
 *   #requirement protomech-combat-state
 */

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

// =============================================================================
// Per-location combat slots
// =============================================================================

/**
 * Armor / structure value slot for a single proto location. The proto combat
 * state keeps these in a `Partial<Record<ProtoLocation, number>>` so Quad
 * chassis (no arms, FrontLegs/RearLegs instead) can omit irrelevant keys.
 */
export type ProtoLocationSlotMap = Partial<Record<ProtoLocation, number>>;

// =============================================================================
// Combat state
// =============================================================================

/**
 * Proto combat state carried for the duration of a battle.
 *
 * Per spec (`protomech-unit-system` delta):
 * - `armorByLocation` entries for Head, Torso, LeftArm, RightArm, Legs, and
 *   MainGun (if present) for Biped / Glider / Ultraheavy chassis.
 * - Quad substitutes `FrontLegs` + `RearLegs` for arms + legs.
 * - `pilotWounded` tracks whether the proto pilot has been wounded (proto
 *   pilots take damage from head crits; cockpit hits are merged into the
 *   engine/equipment crit resolution).
 * - `destroyed` is set when Head or Torso structure reaches 0, or when a
 *   crit of 12 (pilot killed) fires, or when a second engine crit fires.
 */
export interface IProtoMechCombatState {
  readonly unitId: string;
  readonly chassisType: ProtoChassis;
  /** True when the proto has a MainGun location. Mirrors `IProtoMechUnit.hasMainGun`. */
  readonly hasMainGun: boolean;
  /** Armor remaining per proto location. */
  readonly armorByLocation: ProtoLocationSlotMap;
  /** Internal structure remaining per proto location. */
  readonly structureByLocation: ProtoLocationSlotMap;
  /** Locations whose structure has reached 0. */
  readonly destroyedLocations: readonly ProtoLocation[];
  /** True after the proto pilot has taken a wound. Does NOT destroy by itself. */
  readonly pilotWounded: boolean;
  /** Engine critical-hit count. 1 hit = -1 MP; 2 hits = engine destroyed. */
  readonly engineHits: number;
  /** Effective MP penalty from engine damage (adds to movement modifiers). */
  readonly mpPenalty: number;
  /** True once the proto is immobilized (legs destroyed). Proto may still fire. */
  readonly immobilized: boolean;
  /** True when the main gun weapon has been removed (MainGun location destroyed). */
  readonly mainGunRemoved: boolean;
  /** Altitude in hexes for Glider chassis (0 = grounded, 1-5 = airborne). */
  readonly altitude?: number;
  /** True once destroyed (Head/Torso 0, crit 12, or 2nd engine crit). */
  readonly destroyed: boolean;
  /** Cause of destruction when `destroyed === true`. */
  readonly destructionCause?:
    | 'head_destroyed'
    | 'torso_destroyed'
    | 'engine_destroyed'
    | 'pilot_killed'
    | 'glider_fall';
}

// =============================================================================
// Lookup helpers
// =============================================================================

/**
 * Read armor remaining for a location (returns 0 when the key isn't present).
 */
export function getProtoArmor(
  state: IProtoMechCombatState,
  location: ProtoLocation,
): number {
  return state.armorByLocation[location] ?? 0;
}

/**
 * Read structure remaining for a location (returns 0 when the key isn't present).
 */
export function getProtoStructure(
  state: IProtoMechCombatState,
  location: ProtoLocation,
): number {
  return state.structureByLocation[location] ?? 0;
}

/**
 * True if the given location is present on this proto (i.e., initial state
 * carried a key for it). Quad protos return false for `LeftArm` / `RightArm`
 * / `Legs` and true for `FrontLegs` / `RearLegs`.
 */
export function protoHasLocation(
  state: IProtoMechCombatState,
  location: ProtoLocation,
): boolean {
  return (
    Object.prototype.hasOwnProperty.call(state.armorByLocation, location) ||
    Object.prototype.hasOwnProperty.call(state.structureByLocation, location)
  );
}

// =============================================================================
// State constructor
// =============================================================================

/**
 * Construction parameters for a fresh proto combat state.
 */
export interface ICreateProtoCombatStateParams {
  readonly unitId: string;
  readonly chassisType: ProtoChassis;
  readonly hasMainGun: boolean;
  readonly armorByLocation: ProtoLocationSlotMap;
  readonly structureByLocation: ProtoLocationSlotMap;
  /** Initial altitude (Glider chassis only). Defaults to 0 (grounded). */
  readonly altitude?: number;
}

/**
 * Build an initial combat state for a proto. The caller is responsible for
 * matching the armor/structure maps to the chassis:
 *   - Biped / Glider / Ultraheavy → Head, Torso, LeftArm, RightArm, Legs, MainGun?
 *   - Quad → Head, Torso, FrontLegs, RearLegs, MainGun?
 */
export function createProtoMechCombatState(
  params: ICreateProtoCombatStateParams,
): IProtoMechCombatState {
  return {
    unitId: params.unitId,
    chassisType: params.chassisType,
    hasMainGun: params.hasMainGun,
    armorByLocation: { ...params.armorByLocation },
    structureByLocation: { ...params.structureByLocation },
    destroyedLocations: [],
    pilotWounded: false,
    engineHits: 0,
    mpPenalty: 0,
    immobilized: false,
    mainGunRemoved: false,
    altitude:
      params.chassisType === ProtoChassis.GLIDER
        ? (params.altitude ?? 0)
        : undefined,
    destroyed: false,
  };
}
