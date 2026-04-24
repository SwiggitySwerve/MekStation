/**
 * Infantry State Interface
 *
 * Defines the complete state for Infantry platoon units.
 * Infantry are conventional troops with various weapon and armor configurations.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.2
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

import { RulesLevel } from "@/types/enums/RulesLevel";
import { TechBase } from "@/types/enums/TechBase";
import { SquadMotionType } from "@/types/unit/BaseUnitInterfaces";
import { UnitType } from "@/types/unit/BattleMechInterfaces";
import { IInfantryFieldGun } from "@/types/unit/InfantryInterfaces";
import {
  InfantryMotive,
  IPlatoonComposition,
  PLATOON_DEFAULTS,
  MOTIVE_MP,
} from "@/types/unit/InfantryInterfaces";
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from "@/types/unit/PersonnelInterfaces";
import type { IInfantryBVBreakdown } from "@/utils/construction/infantry/infantryBV";
import { computeInfantryBVFromState } from "@/utils/construction/infantry/infantryBVAdapter";
import { generateUnitId as generateUUID } from "@/utils/uuid";

// =============================================================================
// Infantry State Interface
// =============================================================================

/**
 * Complete state for a single Infantry platoon
 */
export interface InfantryState {
  // =========================================================================
  // Identity
  // =========================================================================

  /** Unique unit identifier */
  readonly id: string;

  /** Display name */
  name: string;

  /** Base designation */
  chassis: string;

  /** Variant designation */
  model: string;

  /** Master Unit List ID (-1 for custom) */
  mulId: string;

  /** Introduction year */
  year: number;

  /** Rules level */
  rulesLevel: RulesLevel;

  // =========================================================================
  // Classification
  // =========================================================================

  /** Tech base */
  techBase: TechBase;

  /** Unit type (always INFANTRY) */
  unitType: UnitType.INFANTRY;

  // =========================================================================
  // Platoon Configuration
  // =========================================================================

  /** Squad size (soldiers per squad) */
  squadSize: number;

  /** Number of squads in platoon */
  numberOfSquads: number;

  /** Motion type (legacy SquadMotionType for UI compat) */
  motionType: SquadMotionType;

  /**
   * Infantry motive type — construction-layer granular classification.
   * Drives default composition, MP derivation, and VAL-INF-* rules.
   */
  infantryMotive: InfantryMotive;

  /**
   * Platoon composition: squads × troopersPerSquad.
   * Defaults are derived from infantryMotive via PLATOON_DEFAULTS.
   */
  platoonComposition: IPlatoonComposition;

  /** Ground MP */
  groundMP: number;

  /** Jump MP (0 if no jump capability) */
  jumpMP: number;

  // =========================================================================
  // Weapons
  // =========================================================================

  /** Primary weapon type name */
  primaryWeapon: string;

  /** Primary weapon equipment ID */
  primaryWeaponId?: string;

  /** Secondary weapon (if any) */
  secondaryWeapon?: string;

  /** Secondary weapon equipment ID */
  secondaryWeaponId?: string;

  /** Number of secondary weapons in squad */
  secondaryWeaponCount: number;

  // =========================================================================
  // Protection
  // =========================================================================

  /** Armor kit type */
  armorKit: InfantryArmorKit;

  /** Damage divisor (typically 1 for unarmored, higher for armored) */
  damageDivisor: number;

  // =========================================================================
  // Specialization
  // =========================================================================

  /** Specialization type */
  specialization: InfantrySpecialization;

  /** Has anti-mech training */
  hasAntiMechTraining: boolean;

  /** Is augmented (cybernetics) */
  isAugmented: boolean;

  /** Augmentation type */
  augmentationType?: string;

  // =========================================================================
  // Field Guns
  // =========================================================================

  /** Field guns (if any) */
  fieldGuns: IInfantryFieldGun[];

  // =========================================================================
  // Computed Battle Value
  // =========================================================================

  /**
   * Computed BV breakdown — recomputed reactively by the store on every action
   * that changes a BV input (motive, composition, weapons, armor kit, field
   * guns, anti-mech training).
   *
   * May be `undefined` during initial state creation before the first
   * reactive recomputation runs. Consumers (e.g., `InfantryStatusBar`) should
   * handle the undefined case gracefully.
   *
   * @spec openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
   */
  bvBreakdown?: IInfantryBVBreakdown;

  // =========================================================================
  // Metadata
  // =========================================================================

  /** Unit has been modified from original */
  isModified: boolean;

  /** Timestamp when unit was created */
  createdAt: number;

  /** Timestamp of last modification */
  lastModifiedAt: number;
}

// =============================================================================
// Infantry Store Actions
// =============================================================================

/**
 * Actions available on an Infantry store
 */
export interface InfantryStoreActions {
  // Identity Actions
  setName: (name: string) => void;
  setChassis: (chassis: string) => void;
  setModel: (model: string) => void;
  setMulId: (mulId: string) => void;
  setYear: (year: number) => void;
  setRulesLevel: (level: RulesLevel) => void;

  // Classification Actions
  setTechBase: (techBase: TechBase) => void;

  // Platoon Actions
  setSquadSize: (size: number) => void;
  setNumberOfSquads: (count: number) => void;
  setMotionType: (type: SquadMotionType) => void;
  setGroundMP: (mp: number) => void;
  setJumpMP: (mp: number) => void;

  // Weapon Actions
  setPrimaryWeapon: (weapon: string, equipmentId?: string) => void;
  setSecondaryWeapon: (
    weapon: string | undefined,
    equipmentId?: string,
  ) => void;
  setSecondaryWeaponCount: (count: number) => void;

  // Protection Actions
  setArmorKit: (kit: InfantryArmorKit) => void;
  setDamageDivisor: (divisor: number) => void;

  // Specialization Actions
  setSpecialization: (spec: InfantrySpecialization) => void;
  setAntiMechTraining: (value: boolean) => void;
  setAugmented: (value: boolean, type?: string) => void;

  // Infantry Motive / Composition Actions
  /**
   * Change the platoon motive type.
   * Re-derives platoonComposition from TechManual defaults and re-sets
   * groundMP / jumpMP from MOTIVE_MP — all in a single atomic update.
   */
  setInfantryMotive: (motive: InfantryMotive) => void;
  /**
   * Override the platoon composition (squads × troopersPerSquad).
   * Does not change the motive type or MP values.
   */
  setPlatoonComposition: (comp: IPlatoonComposition) => void;
  /**
   * Update ammo rounds for a field gun at the given index.
   * No-op if idx is out of range.
   */
  setFieldGunAmmo: (idx: number, rounds: number) => void;

  // Field Gun Actions
  addFieldGun: (gun: IInfantryFieldGun) => void;
  removeFieldGun: (equipmentId: string) => void;
  clearFieldGuns: () => void;

  // Metadata Actions
  markModified: (modified?: boolean) => void;
}

/**
 * Complete Infantry store type
 */
export type InfantryStore = InfantryState & InfantryStoreActions;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Options for creating new Infantry
 */
export interface CreateInfantryOptions {
  id?: string;
  name?: string;
  chassis?: string;
  model?: string;
  techBase?: TechBase;
  motionType?: SquadMotionType;
  squadSize?: number;
  numberOfSquads?: number;
}

/**
 * Create a default Infantry state
 */
export function createDefaultInfantryState(
  options: CreateInfantryOptions = {},
): InfantryState {
  const now = Date.now();
  const id = options.id ?? generateUUID();
  const chassis = options.chassis ?? "Rifle Platoon";
  const model = options.model ?? "";

  return {
    // Identity
    id,
    name: `${chassis}${model ? " " + model : ""}`,
    chassis,
    model,
    mulId: "-1",
    year: 3025,
    rulesLevel: RulesLevel.INTRODUCTORY,

    // Classification
    techBase: options.techBase ?? TechBase.INNER_SPHERE,
    unitType: UnitType.INFANTRY,

    // Platoon Configuration
    squadSize: options.squadSize ?? 7,
    numberOfSquads: options.numberOfSquads ?? 4,
    motionType: options.motionType ?? SquadMotionType.FOOT,
    infantryMotive: InfantryMotive.FOOT,
    platoonComposition: PLATOON_DEFAULTS[InfantryMotive.FOOT],
    groundMP: MOTIVE_MP[InfantryMotive.FOOT].groundMP,
    jumpMP: MOTIVE_MP[InfantryMotive.FOOT].jumpMP,

    // Weapons
    primaryWeapon: "Rifle",
    primaryWeaponId: undefined,
    secondaryWeapon: undefined,
    secondaryWeaponId: undefined,
    secondaryWeaponCount: 0,

    // Protection
    armorKit: InfantryArmorKit.NONE,
    damageDivisor: 1,

    // Specialization
    specialization: InfantrySpecialization.NONE,
    hasAntiMechTraining: false,
    isAugmented: false,
    augmentationType: undefined,

    // Field Guns
    fieldGuns: [],

    // Metadata
    isModified: false,
    createdAt: now,
    lastModifiedAt: now,
  };
}

/**
 * Calculate platoon strength (total soldiers)
 */
export function calculatePlatoonStrength(state: InfantryState): number {
  return state.squadSize * state.numberOfSquads;
}

/**
 * Recompute the infantry BV breakdown from the current store state.
 *
 * Delegates to `computeInfantryBVFromState` in the adapter. Kept on the state
 * module (rather than the Zustand factory) so tests and snapshot code can
 * derive the same breakdown without instantiating a store.
 *
 * Returns `undefined` on calculator throw — callers fall back to the previous
 * breakdown or render a neutral UI state. Throws are unexpected (the
 * calculator is pure and handles missing catalog entries gracefully), so the
 * guard is defensive only.
 *
 * @spec openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
 */
export function computeInfantryStateBV(
  state: InfantryState,
): IInfantryBVBreakdown | undefined {
  try {
    return computeInfantryBVFromState({
      infantryMotive: state.infantryMotive,
      platoonComposition: state.platoonComposition,
      armorKit: state.armorKit,
      hasAntiMechTraining: state.hasAntiMechTraining,
      primaryWeapon: state.primaryWeapon,
      primaryWeaponId: state.primaryWeaponId,
      secondaryWeapon: state.secondaryWeapon,
      secondaryWeaponId: state.secondaryWeaponId,
      secondaryWeaponCount: state.secondaryWeaponCount,
      fieldGuns: state.fieldGuns,
    });
  } catch {
    return undefined;
  }
}

/**
 * Get damage divisor for armor kit
 */
export function getArmorKitDivisor(kit: InfantryArmorKit): number {
  switch (kit) {
    case InfantryArmorKit.NONE:
      return 1;
    case InfantryArmorKit.STANDARD:
    case InfantryArmorKit.FLAK:
      return 1;
    case InfantryArmorKit.ABLATIVE:
      return 1.5;
    case InfantryArmorKit.SNEAK_CAMO:
    case InfantryArmorKit.SNEAK_IR:
    case InfantryArmorKit.SNEAK_ECM:
    case InfantryArmorKit.SNEAK_CAMO_IR:
    case InfantryArmorKit.SNEAK_IR_ECM:
    case InfantryArmorKit.SNEAK_COMPLETE:
      return 1;
    case InfantryArmorKit.CLAN:
      return 2;
    case InfantryArmorKit.ENVIRONMENTAL:
      return 1;
    default:
      return 1;
  }
}
