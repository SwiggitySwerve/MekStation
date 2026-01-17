/**
 * Infantry State Interface
 *
 * Defines the complete state for Infantry platoon units.
 * Infantry are conventional troops with various weapon and armor configurations.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.2
 */

import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
  IInfantryFieldGun,
} from '@/types/unit/PersonnelInterfaces';
import { generateUnitId as generateUUID } from '@/utils/uuid';

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

  /** Motion type */
  motionType: SquadMotionType;

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
  setSecondaryWeapon: (weapon: string | undefined, equipmentId?: string) => void;
  setSecondaryWeaponCount: (count: number) => void;

  // Protection Actions
  setArmorKit: (kit: InfantryArmorKit) => void;
  setDamageDivisor: (divisor: number) => void;

  // Specialization Actions
  setSpecialization: (spec: InfantrySpecialization) => void;
  setAntiMechTraining: (value: boolean) => void;
  setAugmented: (value: boolean, type?: string) => void;

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
  options: CreateInfantryOptions = {}
): InfantryState {
  const now = Date.now();
  const id = options.id ?? generateUUID();
  const chassis = options.chassis ?? 'Rifle Platoon';
  const model = options.model ?? '';

  return {
    // Identity
    id,
    name: `${chassis}${model ? ' ' + model : ''}`,
    chassis,
    model,
    mulId: '-1',
    year: 3025,
    rulesLevel: RulesLevel.INTRODUCTORY,

    // Classification
    techBase: options.techBase ?? TechBase.INNER_SPHERE,
    unitType: UnitType.INFANTRY,

    // Platoon Configuration
    squadSize: options.squadSize ?? 7,
    numberOfSquads: options.numberOfSquads ?? 4,
    motionType: options.motionType ?? SquadMotionType.FOOT,
    groundMP: 1,
    jumpMP: 0,

    // Weapons
    primaryWeapon: 'Rifle',
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
