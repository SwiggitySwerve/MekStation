/** Public contracts for the pure mech validation projection and its hook adapters. */
import type { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import type { RulesLevel, Era, TechBase } from '@/types/enums';
import type { UnitType } from '@/types/unit/BattleMechInterfaces';
import type {
  IArmorByLocation,
  ICriticalSlotIssue,
  ISlotsByLocation,
  IValidatableUnit,
} from '@/types/validation/UnitValidationInterfaces';

export interface UnitMetadata {
  /** Unit ID */
  id: string;
  /** Unit name */
  name: string;
  /** Unit type */
  unitType: UnitType;
  /** Tech base */
  techBase: TechBase;
  /** Rules level */
  rulesLevel: RulesLevel;
  /** Introduction year */
  year: number;
  /** Era (derived from year) */
  era: Era;
  /** Extinction year (optional) */
  extinctionYear?: number;
  /** Cost in C-Bills */
  cost: number;
  /** Battle value */
  battleValue: number;
}

export interface ArmorValidationData {
  /** Total armor points allocated */
  totalArmorPoints: number;
  /** Maximum armor points allowed */
  maxArmorPoints: number;
  /** Per-location armor allocation */
  armorByLocation: IArmorByLocation;
}

export interface EquipmentValidationData {
  /** Per-location critical slot usage */
  slotsByLocation: ISlotsByLocation;
  equipmentSlotIssues: readonly ICriticalSlotIssue[];
  mountedEquipment: IValidatableUnit['mountedEquipment'];
  equipmentCatalog: IValidatableUnit['equipmentCatalog'];
}

export interface StructureValidationData {
  /** Engine type */
  engineType: string;
  /** Gyro type */
  gyroType: string;
  /** Cockpit type */
  cockpitType: string;
  /** Internal structure type */
  internalStructureType: string;
  armorType?: string;
  techBaseMode?: TechBaseMode;
  /** Heat sink count */
  heatSinkCount: number;
  /** Heat sink type */
  heatSinkType: string;
}

export interface WeightValidationData {
  /** Total weight allocated by all components and equipment */
  allocatedWeight: number;
  /** Maximum weight allowed (tonnage) */
  maxWeight: number;
  /** Structural weight (engine, gyro, structure, cockpit, heat sinks, armor) */
  structuralWeight: number;
  /** Equipment weight */
  equipmentWeight: number;
  /** Remaining weight capacity */
  remainingWeight: number;
  /** Whether weight is within limits */
  isValid: boolean;
}
