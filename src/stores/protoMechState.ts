/**
 * ProtoMech State Interface
 *
 * Defines the complete state for ProtoMech units.
 * ProtoMechs are small, Clan-tech combat walkers operating in points.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.3
 */

import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { IEquipmentItem } from '@/types/equipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IProtoMechMountedEquipment } from '@/types/unit/PersonnelInterfaces';
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

  /** Weight per unit in tons (2-9 tons) */
  tonnage: number;

  /** Point size (typically 5 ProtoMechs per point) */
  pointSize: number;

  /** Is this a quad ProtoMech */
  isQuad: boolean;

  /** Is this a glider ProtoMech */
  isGlider: boolean;

  // =========================================================================
  // Movement
  // =========================================================================

  /** Engine rating */
  engineRating: number;

  /** Cruise MP */
  cruiseMP: number;

  /** Flank MP (cruise * 1.5) */
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

  // =========================================================================
  // Special Systems
  // =========================================================================

  /** Has myomer booster */
  hasMyomerBooster: boolean;

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

  // Movement Actions
  setEngineRating: (rating: number) => void;
  setCruiseMP: (mp: number) => void;
  setJumpMP: (mp: number) => void;

  // Structure & Armor Actions
  setArmorType: (type: number) => void;
  setLocationArmor: (location: ProtoMechLocation, points: number) => void;
  setLocationStructure: (location: ProtoMechLocation, points: number) => void;
  autoAllocateArmor: () => void;
  clearAllArmor: () => void;

  // Main Gun Actions
  setMainGun: (hasMainGun: boolean) => void;

  // Special System Actions
  setMyomerBooster: (value: boolean) => void;
  setMagneticClamps: (value: boolean) => void;
  setExtendedTorsoTwist: (value: boolean) => void;

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

  // Calculate cruise MP from tonnage (simplified)
  const cruiseMP = Math.max(1, 10 - tonnage);

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
    pointSize: 5,
    isQuad: options.isQuad ?? false,
    isGlider: false,

    // Movement
    engineRating: tonnage * cruiseMP,
    cruiseMP,
    flankMP: Math.floor(cruiseMP * 1.5),
    jumpMP: 0,

    // Structure & Armor
    structureByLocation: getDefaultProtoMechStructure(tonnage),
    armorByLocation: createEmptyProtoMechArmorAllocation(),
    armorType: 0, // Standard ProtoMech armor

    // Main Gun
    hasMainGun: false,

    // Special Systems
    hasMyomerBooster: false,
    hasMagneticClamps: false,
    hasExtendedTorsoTwist: false,

    // Equipment
    equipment: [],

    // Metadata
    isModified: false,
    createdAt: now,
    lastModifiedAt: now,
  };
}
