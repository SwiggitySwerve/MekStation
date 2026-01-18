/**
 * Battle Armor State Interface
 *
 * Defines the complete state for Battle Armor units.
 * Battle Armor are squad-based units with individual troopers.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.1
 */

import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
  ManipulatorType,
  IBattleArmorMountedEquipment,
} from '@/types/unit/PersonnelInterfaces';
import { BattleArmorLocation } from '@/types/construction/UnitLocation';
import { IEquipmentItem } from '@/types/equipment';
import { generateUnitId as generateUUID } from '@/utils/uuid';

// =============================================================================
// Battle Armor Mounted Equipment
// =============================================================================

/**
 * Create mounted equipment instance for Battle Armor
 */
export function createBattleArmorMountedEquipment(
  item: IEquipmentItem,
  instanceId: string,
  location?: BattleArmorLocation
): IBattleArmorMountedEquipment {
  return {
    id: instanceId,
    equipmentId: item.id,
    name: item.name,
    location: location ?? BattleArmorLocation.SQUAD,
    isAPMount: false,
    isTurretMounted: false,
    isModular: false,
  };
}

// =============================================================================
// Battle Armor State Interface
// =============================================================================

/**
 * Complete state for a single Battle Armor unit (squad)
 */
export interface BattleArmorState {
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

  /** Tech base */
  techBase: TechBase;

  /** Unit type (always BATTLE_ARMOR) */
  unitType: UnitType.BATTLE_ARMOR;

  /** Chassis type (Biped or Quad) */
  chassisType: BattleArmorChassisType;

  /** Weight class */
  weightClass: BattleArmorWeightClass;

  /** Weight per trooper in kg */
  weightPerTrooper: number;

  // =========================================================================
  // Squad Configuration
  // =========================================================================

  /** Number of troopers in squad (typically 4-6) */
  squadSize: number;

  /** Motion type */
  motionType: SquadMotionType;

  /** Ground MP */
  groundMP: number;

  /** Jump MP (0 if no jump capability) */
  jumpMP: number;

  /** Has mechanical jump boosters (instead of jump jets) */
  hasMechanicalJumpBoosters: boolean;

  /** UMU MP (underwater maneuvering unit) */
  umuMP: number;

  // =========================================================================
  // Manipulators
  // =========================================================================

  /** Left arm manipulator */
  leftManipulator: ManipulatorType;

  /** Right arm manipulator */
  rightManipulator: ManipulatorType;

  // =========================================================================
  // Armor
  // =========================================================================

  /** Armor type code */
  armorType: number;

  /** Armor points per trooper */
  armorPerTrooper: number;

  // =========================================================================
  // Mount Options
  // =========================================================================

  /** Has anti-personnel weapon mount */
  hasAPMount: boolean;

  /** Has modular weapon mount */
  hasModularMount: boolean;

  /** Has turret mount */
  hasTurretMount: boolean;

  // =========================================================================
  // Special Systems
  // =========================================================================

  /** Has stealth system */
  hasStealthSystem: boolean;

  /** Stealth system type */
  stealthType?: string;

  /** Has mimetic armor */
  hasMimeticArmor: boolean;

  /** Has fire-resistant armor */
  hasFireResistantArmor: boolean;

  // =========================================================================
  // Equipment
  // =========================================================================

  /** Equipment mounted on this BA */
  equipment: IBattleArmorMountedEquipment[];

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
// Battle Armor Store Actions
// =============================================================================

/**
 * Actions available on a Battle Armor store
 */
export interface BattleArmorStoreActions {
  // Identity Actions
  setName: (name: string) => void;
  setChassis: (chassis: string) => void;
  setModel: (model: string) => void;
  setMulId: (mulId: string) => void;
  setYear: (year: number) => void;
  setRulesLevel: (level: RulesLevel) => void;

  // Classification Actions
  setTechBase: (techBase: TechBase) => void;
  setChassisType: (type: BattleArmorChassisType) => void;
  setWeightClass: (wc: BattleArmorWeightClass) => void;
  setWeightPerTrooper: (weight: number) => void;

  // Squad Actions
  setSquadSize: (size: number) => void;
  setMotionType: (type: SquadMotionType) => void;
  setGroundMP: (mp: number) => void;
  setJumpMP: (mp: number) => void;
  setMechanicalJumpBoosters: (value: boolean) => void;
  setUmuMP: (mp: number) => void;

  // Manipulator Actions
  setLeftManipulator: (type: ManipulatorType) => void;
  setRightManipulator: (type: ManipulatorType) => void;

  // Armor Actions
  setArmorType: (type: number) => void;
  setArmorPerTrooper: (points: number) => void;

  // Mount Actions
  setAPMount: (value: boolean) => void;
  setModularMount: (value: boolean) => void;
  setTurretMount: (value: boolean) => void;

  // Special System Actions
  setStealthSystem: (value: boolean, type?: string) => void;
  setMimeticArmor: (value: boolean) => void;
  setFireResistantArmor: (value: boolean) => void;

  // Equipment Actions
  addEquipment: (item: IEquipmentItem, location?: BattleArmorLocation) => string;
  removeEquipment: (instanceId: string) => void;
  updateEquipmentLocation: (instanceId: string, location: BattleArmorLocation) => void;
  setEquipmentAPMount: (instanceId: string, isAPMount: boolean) => void;
  setEquipmentTurretMount: (instanceId: string, isTurret: boolean) => void;
  setEquipmentModular: (instanceId: string, isModular: boolean) => void;
  clearAllEquipment: () => void;

  // Metadata Actions
  markModified: (modified?: boolean) => void;
}

/**
 * Complete Battle Armor store type
 */
export type BattleArmorStore = BattleArmorState & BattleArmorStoreActions;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Options for creating a new Battle Armor
 */
export interface CreateBattleArmorOptions {
  id?: string;
  name?: string;
  chassis?: string;
  model?: string;
  techBase?: TechBase;
  chassisType?: BattleArmorChassisType;
  weightClass?: BattleArmorWeightClass;
  squadSize?: number;
}

/**
 * Create a default Battle Armor state
 */
export function createDefaultBattleArmorState(
  options: CreateBattleArmorOptions = {}
): BattleArmorState {
  const now = Date.now();
  const id = options.id ?? generateUUID();
  const chassis = options.chassis ?? 'New Battle Armor';
  const model = options.model ?? '';

  return {
    // Identity
    id,
    name: `${chassis}${model ? ' ' + model : ''}`,
    chassis,
    model,
    mulId: '-1',
    year: 3050,
    rulesLevel: RulesLevel.STANDARD,

    // Classification
    techBase: options.techBase ?? TechBase.INNER_SPHERE,
    unitType: UnitType.BATTLE_ARMOR,
    chassisType: options.chassisType ?? BattleArmorChassisType.BIPED,
    weightClass: options.weightClass ?? BattleArmorWeightClass.MEDIUM,
    weightPerTrooper: 1000, // 1 ton per trooper default

    // Squad Configuration
    squadSize: options.squadSize ?? 4,
    motionType: SquadMotionType.JUMP,
    groundMP: 1,
    jumpMP: 3,
    hasMechanicalJumpBoosters: false,
    umuMP: 0,

    // Manipulators
    leftManipulator: ManipulatorType.BATTLE,
    rightManipulator: ManipulatorType.BATTLE,

    // Armor
    armorType: 0, // Standard BA armor
    armorPerTrooper: 5,

    // Mount Options
    hasAPMount: false,
    hasModularMount: false,
    hasTurretMount: false,

    // Special Systems
    hasStealthSystem: false,
    stealthType: undefined,
    hasMimeticArmor: false,
    hasFireResistantArmor: false,

    // Equipment
    equipment: [],

    // Metadata
    isModified: false,
    createdAt: now,
    lastModifiedAt: now,
  };
}
