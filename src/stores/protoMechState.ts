/**
 * ProtoMech State Interface
 *
 * Defines the complete state for ProtoMech units.
 * ProtoMechs are small, Clan-tech combat walkers operating in points.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.3
 * @spec openspec/changes/add-protomech-construction/tasks.md §1
 */

import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { IEquipmentItem } from '@/types/equipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IProtoMechMountedEquipment } from '@/types/unit/PersonnelInterfaces';
import {
  ProtoChassis,
  ProtoWeightClass,
} from '@/types/unit/ProtoMechInterfaces';
import {
  getProtoWeightClass,
  getProtoMPCaps,
  effectiveWalkMP,
} from '@/utils/construction/protomech';
import { generateUnitId as generateUUID } from '@/utils/uuid';

// =============================================================================
// ProtoMech Armor/Structure Allocation
// =============================================================================

/**
 * ProtoMech armor allocation by location
 */
export interface IProtoMechArmorAllocation {
  /** Index signature for dynamic access */
  [key: string]: number;

  [ProtoMechLocation.HEAD]: number;
  [ProtoMechLocation.TORSO]: number;
  [ProtoMechLocation.LEFT_ARM]: number;
  [ProtoMechLocation.RIGHT_ARM]: number;
  [ProtoMechLocation.LEGS]: number;
  [ProtoMechLocation.MAIN_GUN]: number;
}

/**
 * Create empty ProtoMech armor allocation
 */
export function createEmptyProtoMechArmorAllocation(): IProtoMechArmorAllocation {
  return {
    [ProtoMechLocation.HEAD]: 0,
    [ProtoMechLocation.TORSO]: 0,
    [ProtoMechLocation.LEFT_ARM]: 0,
    [ProtoMechLocation.RIGHT_ARM]: 0,
    [ProtoMechLocation.LEGS]: 0,
    [ProtoMechLocation.MAIN_GUN]: 0,
  };
}

/**
 * Calculate total ProtoMech armor
 */
export function getTotalProtoMechArmor(
  allocation: IProtoMechArmorAllocation,
): number {
  return (
    (allocation[ProtoMechLocation.HEAD] || 0) +
    (allocation[ProtoMechLocation.TORSO] || 0) +
    (allocation[ProtoMechLocation.LEFT_ARM] || 0) +
    (allocation[ProtoMechLocation.RIGHT_ARM] || 0) +
    (allocation[ProtoMechLocation.LEGS] || 0) +
    (allocation[ProtoMechLocation.MAIN_GUN] || 0)
  );
}

// =============================================================================
// ProtoMech Mounted Equipment
// =============================================================================

/**
 * Create mounted equipment instance for ProtoMech
 */
export function createProtoMechMountedEquipment(
  item: IEquipmentItem,
  instanceId: string,
  location?: ProtoMechLocation,
): IProtoMechMountedEquipment {
  return {
    id: instanceId,
    equipmentId: item.id,
    name: item.name,
    location: location ?? ProtoMechLocation.TORSO,
    linkedAmmoId: undefined,
  };
}

// =============================================================================
// ProtoMech State Interface
// =============================================================================

/**
 * Complete state for a single ProtoMech unit
 */
export interface ProtoMechState {
  // =========================================================================
  // Identity
  // =========================================================================

  /** Unique unit identifier */
  readonly id: string;

  /** Display name (chassis + variant) */
  name: string;

  /** Base chassis name */
  chassis: string;

  /** Model/variant designation */
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

  /** Tech base (always Clan for ProtoMechs) */
  techBase: TechBase;

  /** Unit type (always PROTOMECH) */
  unitType: UnitType.PROTOMECH;

  /** Weight per unit in tons (2–15 tons; Ultraheavy up to 15) */
  tonnage: number;

  /** Derived weight class from tonnage */
  weightClass: ProtoWeightClass;

  /** Chassis type (Biped / Quad / Glider / Ultraheavy) — canonical field */
  chassisType: ProtoChassis;

  /** Point size (typically 5 ProtoMechs per point) */
  pointSize: number;

  /** @deprecated Use chassisType === ProtoChassis.QUAD. Kept for backward compat. */
  isQuad: boolean;

  /** @deprecated Use chassisType === ProtoChassis.GLIDER. Kept for backward compat. */
  isGlider: boolean;

  // =========================================================================
  // Movement
  // =========================================================================

  /** Engine rating */
  engineRating: number;

  /**
   * Base walk MP (before Myomer Booster). This is the canonical field used by
   * VAL-PROTO-MP. Cruise MP is an alias for walk MP on ground ProtoMechs.
   */
  walkMP: number;

  /** Cruise MP — kept for backward compat; equals walkMP */
  cruiseMP: number;

  /** Flank MP (walk + 1 after booster, then +1 run) */
  flankMP: number;

  /** Jump MP */
  jumpMP: number;

  // =========================================================================
  // Structure & Armor
  // =========================================================================

  /** Internal structure per location */
  structureByLocation: IProtoMechArmorAllocation;

  /** Armor per location */
  armorByLocation: IProtoMechArmorAllocation;

  /** Armor type (typically standard for ProtoMechs) */
  armorType: number;

  // =========================================================================
  // Main Gun
  // =========================================================================

  /** Has main gun mount */
  hasMainGun: boolean;

  /**
   * Equipment ID of the weapon installed in the MainGun location.
   * undefined when hasMainGun is false or no weapon has been assigned.
   */
  mainGunWeaponId: string | undefined;

  // =========================================================================
  // Special Systems
  // =========================================================================

  /** Has myomer booster */
  hasMyomerBooster: boolean;

  /**
   * Gliding wings: only legal on Glider chassis (Light class). Adds +2 jump MP
   * via effectiveJumpMP; the base jumpMP is stored separately.
   */
  glidingWings: boolean;

  /** Has magnetic clamps */
  hasMagneticClamps: boolean;

  /** Has extended torso twist */
  hasExtendedTorsoTwist: boolean;

  // =========================================================================
  // Equipment
  // =========================================================================

  /** Equipment mounted on this ProtoMech */
  equipment: IProtoMechMountedEquipment[];

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
// ProtoMech Store Actions
// =============================================================================

/**
 * Actions available on a ProtoMech store
 */
export interface ProtoMechStoreActions {
  // Identity Actions
  setName: (name: string) => void;
  setChassis: (chassis: string) => void;
  setModel: (model: string) => void;
  setMulId: (mulId: string) => void;
  setYear: (year: number) => void;
  setRulesLevel: (level: RulesLevel) => void;

  // Classification Actions
  setTonnage: (tonnage: number) => void;
  setPointSize: (size: number) => void;
  setQuad: (isQuad: boolean) => void;
  setGlider: (isGlider: boolean) => void;
  /**
   * Set the chassis type. Re-derives weight class + MP caps; resets glidingWings
   * if the new chassis is not Glider, and clears jump MP for Ultraheavy.
   */
  setChassisType: (chassis: ProtoChassis) => void;

  // Movement Actions
  setEngineRating: (rating: number) => void;
  setCruiseMP: (mp: number) => void;
  /**
   * Set base walk MP. Validates against the weight-class cap and re-derives
   * engine rating. Does NOT apply the Myomer Booster — use effectiveWalkMP()
   * for display purposes.
   */
  setWalkMP: (mp: number) => void;
  setJumpMP: (mp: number) => void;

  // Structure & Armor Actions
  setArmorType: (type: number) => void;
  setLocationArmor: (location: ProtoMechLocation, points: number) => void;
  setLocationStructure: (location: ProtoMechLocation, points: number) => void;
  autoAllocateArmor: () => void;
  clearAllArmor: () => void;

  // Main Gun Actions
  setMainGun: (hasMainGun: boolean) => void;
  /**
   * Assign or clear the weapon in the MainGun location.
   * The weapon ID is validated against PROTO_MAIN_GUN_APPROVED_WEAPON_IDS in
   * VAL-PROTO-MAIN-GUN; this action stores the value unconditionally so the
   * UI can show validation errors without blocking the user.
   */
  setMainGunWeaponId: (weaponId: string | null) => void;

  // Special System Actions
  setMyomerBooster: (value: boolean) => void;
  setMagneticClamps: (value: boolean) => void;
  setExtendedTorsoTwist: (value: boolean) => void;
  /**
   * Enable or disable Glider Wings. Only legal when chassisType is GLIDER
   * (Light class). Storing the value unconditionally lets validation surface
   * the error rather than silently refusing the set.
   */
  setGlidingWings: (enabled: boolean) => void;

  // Equipment Actions
  addEquipment: (item: IEquipmentItem, location?: ProtoMechLocation) => string;
  removeEquipment: (instanceId: string) => void;
  updateEquipmentLocation: (
    instanceId: string,
    location: ProtoMechLocation,
  ) => void;
  linkAmmo: (
    weaponInstanceId: string,
    ammoInstanceId: string | undefined,
  ) => void;
  clearAllEquipment: () => void;

  // Metadata Actions
  markModified: (modified?: boolean) => void;
}

/**
 * Complete ProtoMech store type
 */
export type ProtoMechStore = ProtoMechState & ProtoMechStoreActions;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Options for creating a new ProtoMech
 */
export interface CreateProtoMechOptions {
  id?: string;
  name?: string;
  chassis?: string;
  model?: string;
  tonnage?: number;
  isQuad?: boolean;
}

/**
 * Get default internal structure for ProtoMech tonnage
 */
function getDefaultProtoMechStructure(
  tonnage: number,
): IProtoMechArmorAllocation {
  // Simplified structure based on tonnage
  const base = Math.ceil(tonnage / 2);
  return {
    [ProtoMechLocation.HEAD]: Math.max(1, Math.floor(base * 0.5)),
    [ProtoMechLocation.TORSO]: base + 2,
    [ProtoMechLocation.LEFT_ARM]: Math.max(1, Math.floor(base * 0.75)),
    [ProtoMechLocation.RIGHT_ARM]: Math.max(1, Math.floor(base * 0.75)),
    [ProtoMechLocation.LEGS]: base + 1,
    [ProtoMechLocation.MAIN_GUN]: 1,
  };
}

/**
 * Create a default ProtoMech state
 */
export function createDefaultProtoMechState(
  options: CreateProtoMechOptions = {},
): ProtoMechState {
  const now = Date.now();
  const id = options.id ?? generateUUID();
  const chassis = options.chassis ?? 'New ProtoMech';
  const model = options.model ?? '';
  const tonnage = options.tonnage ?? 5;
  const chassisType = options.isQuad ? ProtoChassis.QUAD : ProtoChassis.BIPED;
  const weightClass = getProtoWeightClass(tonnage);

  // Default walk MP to the minimum 1 — the user sets it via setWalkMP
  const walkMP = Math.max(1, Math.min(getProtoMPCaps(weightClass).walkMax, 4));
  // Cruise MP mirrors walk MP for ProtoMechs
  const cruiseMP = walkMP;
  // Effective walk (with booster = false by default) drives flank MP
  const effWalk = effectiveWalkMP(walkMP, false);
  const flankMP = effWalk + 1;

  return {
    // Identity
    id,
    name: `${chassis}${model ? ' ' + model : ''}`,
    chassis,
    model,
    mulId: '-1',
    year: 3060,
    rulesLevel: RulesLevel.ADVANCED,

    // Classification
    techBase: TechBase.CLAN, // ProtoMechs are always Clan tech
    unitType: UnitType.PROTOMECH,
    tonnage,
    weightClass,
    chassisType,
    pointSize: 5,
    isQuad: options.isQuad ?? false,
    isGlider: false,

    // Movement
    engineRating: tonnage * walkMP,
    walkMP,
    cruiseMP,
    flankMP,
    jumpMP: 0,

    // Structure & Armor
    structureByLocation: getDefaultProtoMechStructure(tonnage),
    armorByLocation: createEmptyProtoMechArmorAllocation(),
    armorType: 0, // Standard ProtoMech armor

    // Main Gun
    hasMainGun: false,
    mainGunWeaponId: undefined,

    // Special Systems
    hasMyomerBooster: false,
    hasMagneticClamps: false,
    hasExtendedTorsoTwist: false,
    glidingWings: false,

    // Equipment
    equipment: [],

    // Metadata
    isModified: false,
    createdAt: now,
    lastModifiedAt: now,
  };
}
