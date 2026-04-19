/**
 * Vehicle Combat Interfaces
 *
 * State, results, and event payloads for the vehicle combat pipeline
 * (damage resolution, motive-damage rolls, vehicle critical hits).
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/vehicle-unit-system/spec.md
 */

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

// =============================================================================
// Hit Location (Vehicle)
// =============================================================================

/**
 * The locations a vehicle hit location roll can resolve to.
 *
 * `front`, `left_side`, `right_side`, `rear`, `turret`, and (VTOL only) `rotor`
 * — all are the domain of the 6-section vehicle hit-location table.
 */
export type VehicleHitLocation =
  | 'front'
  | 'left_side'
  | 'right_side'
  | 'rear'
  | 'turret'
  | 'rotor';

/**
 * Which arc the attacker hit from, relative to the target vehicle's facing.
 */
export type VehicleAttackDirection = 'front' | 'left' | 'right' | 'rear';

/**
 * Outcome of a vehicle hit-location roll.
 */
export interface IVehicleHitLocationResult {
  readonly dice: readonly [number, number];
  readonly roll: number;
  readonly direction: VehicleAttackDirection;
  readonly location: VehicleHitLocation;
  /** True when the table entry marks a TAC (Through-Armor Critical) trigger. */
  readonly isTAC: boolean;
}

// =============================================================================
// Motive Damage
// =============================================================================

/**
 * Severity of a motive-damage roll outcome.
 */
export type MotiveDamageSeverity =
  | 'none'
  | 'minor'
  | 'moderate'
  | 'heavy'
  | 'immobilized';

/**
 * Result of a single 2d6 motive-damage table roll.
 */
export interface IMotiveDamageRollResult {
  readonly dice: readonly [number, number];
  readonly roll: number;
  readonly severity: MotiveDamageSeverity;
  /** How much cruise MP this roll deducts (positive number). */
  readonly mpPenalty: number;
  /** Whether this roll should also mark the vehicle as immobilized outright. */
  readonly immobilized: boolean;
}

// =============================================================================
// Vehicle Critical Hit
// =============================================================================

/**
 * Kind of vehicle critical hit (per TW crit table).
 */
export type VehicleCritKind =
  | 'none'
  | 'crew_stunned'
  | 'weapon_destroyed'
  | 'cargo_hit'
  | 'driver_hit'
  | 'fuel_tank'
  | 'engine_hit'
  | 'ammo_explosion';

/**
 * Result of a vehicle crit-table roll.
 */
export interface IVehicleCritRollResult {
  readonly dice: readonly [number, number];
  readonly roll: number;
  readonly kind: VehicleCritKind;
}

// =============================================================================
// Turret
// =============================================================================

/**
 * Which (if any) of the vehicle's turrets are locked.
 */
export interface ITurretLockState {
  readonly primaryLocked: boolean;
  readonly secondaryLocked: boolean;
}

// =============================================================================
// Vehicle Combat State
// =============================================================================

/**
 * Motive-damage counters tracked on the vehicle's combat state. These are
 * updated by the combat pipeline; the underlying unit remains immutable.
 */
export interface IMotiveDamageState {
  /** Cruise MP recorded when combat started (pre-penalty). */
  readonly originalCruiseMP: number;
  /** Accumulated cruise-MP reduction (always ≥ 0). */
  readonly penaltyMP: number;
  /** Set once the vehicle is fully immobilized. */
  readonly immobilized: boolean;
  /**
   * Set when a Hover/Naval/Hydrofoil vehicle is taking on water damage
   * and will be destroyed after sinking resolves.
   */
  readonly sinking: boolean;
  /** Primary turret has been locked by a crit. */
  readonly turretLocked: boolean;
  /** Engine-hit count (2 destroys the vehicle). */
  readonly engineHits: number;
  /** Driver-hit count (per TW, 2 kills the crew). */
  readonly driverHits: number;
  /** Commander-hit count (per TW, 2 kills the crew). */
  readonly commanderHits: number;
  /**
   * Number of upcoming phases the crew spends recovering from stun.
   * Decremented by the phase driver.
   */
  readonly crewStunnedPhases: number;
}

/**
 * Full combat state for a vehicle (armor, structure, motive counters, turret
 * lock, altitude). Kept separate from the unit itself so construction data
 * remains immutable.
 */
export interface IVehicleCombatState {
  readonly unitId: string;
  readonly motionType: GroundMotionType;
  /** Armor remaining per vehicle location. */
  readonly armor: Readonly<
    Partial<Record<VehicleLocation | VTOLLocation, number>>
  >;
  /** Internal structure remaining per vehicle location. */
  readonly structure: Readonly<
    Partial<Record<VehicleLocation | VTOLLocation, number>>
  >;
  readonly destroyedLocations: readonly (VehicleLocation | VTOLLocation)[];
  readonly motive: IMotiveDamageState;
  readonly turretLock: ITurretLockState;
  /** Altitude for VTOLs (0 = hover, 1-5 = flight). Undefined for ground vehicles. */
  readonly altitude?: number;
  readonly destroyed: boolean;
  readonly destructionCause?:
    | 'damage'
    | 'motive_immobilized'
    | 'engine_destroyed'
    | 'ammo_explosion'
    | 'crash'
    | 'sinking'
    | 'crew_killed';
}

// =============================================================================
// Damage Results
// =============================================================================

/**
 * Per-location damage resolution outcome for a vehicle.
 */
export interface IVehicleLocationDamage {
  readonly location: VehicleLocation | VTOLLocation;
  readonly damage: number;
  readonly armorDamage: number;
  readonly structureDamage: number;
  readonly armorRemaining: number;
  readonly structureRemaining: number;
  readonly destroyed: boolean;
  /** Whether the damage broke into structure (triggers motive roll). */
  readonly structureExposed: boolean;
}

/**
 * Aggregate result of one vehicle damage-resolution call.
 */
export interface IVehicleResolveDamageResult {
  readonly state: IVehicleCombatState;
  readonly locationDamages: readonly IVehicleLocationDamage[];
  readonly motiveRoll?: IMotiveDamageRollResult;
  readonly critRoll?: IVehicleCritRollResult;
  readonly crashCheckTriggered: boolean;
  readonly unitDestroyed: boolean;
  readonly destructionCause?: IVehicleCombatState['destructionCause'];
}

// =============================================================================
// Effective MP
// =============================================================================

/**
 * Effective cruise / flank MP after motive-damage penalties.
 */
export interface IEffectiveVehicleMP {
  readonly cruiseMP: number;
  readonly flankMP: number;
  readonly immobilized: boolean;
}
