/**
 * BattleMech Unit Interfaces
 * 
 * Defines the complete BattleMech unit model with all component references.
 * 
 * @spec openspec/specs/unit-entity-model/spec.md
 */

import { IEntity, ITechBaseEntity, ITemporalEntity, IValuedComponent } from '../core';
import { RulesLevel, Era, WeightClass } from '../enums';
import { 
  EngineType, 
  GyroType, 
  InternalStructureType, 
  HeatSinkType, 
  ArmorTypeEnum,
  CockpitType,
  MechLocation,
  IArmorAllocation,
} from '../construction';

/**
 * Unit type enumeration
 */
export enum UnitType {
  BATTLEMECH = 'BattleMech',
  OMNIMECH = 'OmniMech',
  INDUSTRIALMECH = 'IndustrialMech',
  PROTOMECH = 'ProtoMech',
  VEHICLE = 'Vehicle',
  VTOL = 'VTOL',
  AEROSPACE = 'Aerospace',
  CONVENTIONAL_FIGHTER = 'Conventional Fighter',
  SMALL_CRAFT = 'Small Craft',
  DROPSHIP = 'DropShip',
  JUMPSHIP = 'JumpShip',
  WARSHIP = 'WarShip',
  SPACE_STATION = 'Space Station',
  INFANTRY = 'Infantry',
  BATTLE_ARMOR = 'Battle Armor',
  SUPPORT_VEHICLE = 'Support Vehicle',
}

/**
 * Mech configuration type
 */
export enum MechConfiguration {
  BIPED = 'Biped',
  QUAD = 'Quad',
  TRIPOD = 'Tripod',
  LAM = 'LAM',
  QUADVEE = 'QuadVee',
}

/**
 * Unit metadata
 */
export interface IUnitMetadata {
  readonly chassis: string;
  readonly model: string;
  readonly variant?: string;
  readonly source?: string;
  readonly era: Era;
  readonly year: number;
  readonly rulesLevel: RulesLevel;
  readonly role?: string;
  readonly manufacturer?: string;
  readonly primaryFactory?: string;
  readonly notes?: string;
}

/**
 * Engine configuration
 */
export interface IEngineConfiguration {
  readonly type: EngineType;
  readonly rating: number;
  readonly integralHeatSinks: number;
}

/**
 * Gyro configuration
 */
export interface IGyroConfiguration {
  readonly type: GyroType;
  readonly weight: number;
}

/**
 * Internal structure configuration
 */
export interface IStructureConfiguration {
  readonly type: InternalStructureType;
  readonly points: Partial<Record<MechLocation, number>>;
}

/**
 * Heat sink configuration
 */
export interface IHeatSinkConfiguration {
  readonly type: HeatSinkType;
  readonly total: number;
  readonly integrated: number;
  readonly external: number;
}

/**
 * Movement configuration
 */
export interface IMovementConfiguration {
  readonly walkMP: number;
  readonly runMP: number;
  readonly jumpMP: number;
  readonly jumpJetType?: string;
  readonly hasMASC: boolean;
  readonly hasSupercharger: boolean;
  readonly hasTSM: boolean;
}

/**
 * Mounted equipment item
 */
export interface IMountedEquipment {
  readonly id: string;
  readonly equipmentId: string;
  readonly name: string;
  readonly location: MechLocation;
  readonly slots: number[];
  readonly isRearMounted: boolean;
  readonly isTurretMounted: boolean;
  readonly linkedAmmoId?: string;
}

/**
 * Critical slot assignment
 */
export interface ICriticalSlotAssignment {
  readonly location: MechLocation;
  readonly slots: ICriticalSlot[];
}

/**
 * Individual critical slot
 */
export interface ICriticalSlot {
  readonly index: number;
  readonly content: ICriticalSlotContent | null;
  readonly isFixed: boolean;
  readonly isDestroyed: boolean;
}

/**
 * Critical slot content
 */
export interface ICriticalSlotContent {
  readonly type: 'equipment' | 'actuator' | 'system' | 'structure' | 'armor';
  readonly equipmentId?: string;
  readonly name: string;
  readonly isHittable: boolean;
}

/**
 * Complete BattleMech interface
 */
export interface IBattleMech extends IEntity, ITechBaseEntity, ITemporalEntity, IValuedComponent {
  readonly unitType: UnitType;
  readonly configuration: MechConfiguration;
  readonly tonnage: number;
  readonly weightClass: WeightClass;
  
  // Metadata
  readonly metadata: IUnitMetadata;
  
  // Structural components
  readonly engine: IEngineConfiguration;
  readonly gyro: IGyroConfiguration;
  readonly cockpitType: CockpitType;
  readonly structure: IStructureConfiguration;
  
  // Armor
  readonly armorType: ArmorTypeEnum;
  readonly armorAllocation: IArmorAllocation;
  readonly totalArmorPoints: number;
  
  // Heat management
  readonly heatSinks: IHeatSinkConfiguration;
  
  // Movement
  readonly movement: IMovementConfiguration;
  
  // Equipment
  readonly equipment: readonly IMountedEquipment[];
  
  // Critical slots
  readonly criticalSlots: readonly ICriticalSlotAssignment[];
  
  // Quirks (optional)
  readonly quirks?: readonly string[];
  
  // Calculated values
  readonly totalWeight: number;
  readonly remainingTonnage: number;
  readonly isValid: boolean;
  readonly validationErrors: readonly string[];
}

/**
 * BattleMech builder interface for construction
 */
export interface IBattleMechBuilder {
  setMetadata(metadata: Partial<IUnitMetadata>): IBattleMechBuilder;
  setTonnage(tonnage: number): IBattleMechBuilder;
  setConfiguration(config: MechConfiguration): IBattleMechBuilder;
  setEngine(type: EngineType, rating: number): IBattleMechBuilder;
  setGyro(type: GyroType): IBattleMechBuilder;
  setCockpit(type: CockpitType): IBattleMechBuilder;
  setStructure(type: InternalStructureType): IBattleMechBuilder;
  setArmor(type: ArmorTypeEnum, allocation: IArmorAllocation): IBattleMechBuilder;
  setHeatSinks(type: HeatSinkType, count: number): IBattleMechBuilder;
  setMovement(walk: number, jump?: number): IBattleMechBuilder;
  addEquipment(equipmentId: string, location: MechLocation): IBattleMechBuilder;
  removeEquipment(mountedId: string): IBattleMechBuilder;
  build(): IBattleMech;
  validate(): { isValid: boolean; errors: string[] };
}

/**
 * OmniMech-specific interface extending BattleMech
 */
export interface IOmniMech extends IBattleMech {
  readonly baseConfiguration: string;
  readonly podSpace: Record<MechLocation, number>;
  readonly fixedEquipment: readonly IMountedEquipment[];
  readonly podEquipment: readonly IMountedEquipment[];
}

