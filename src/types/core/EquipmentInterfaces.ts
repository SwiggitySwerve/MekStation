/**
 * Equipment Interfaces for BattleTech Editor
 * 
 * Comprehensive interfaces for equipment definitions and factory patterns.
 * Focuses solely on the equipment data structures and their creation.
 */

import {
  IIdentifiable,
  INamed,
  IDescribable,
  ITechBased,
  IRulesLeveled,
  IWeighted,
  ISlotted,
  ILocationRestricted,
  IEquipmentConfiguration,
  IRangeProfile,
  IService,
  Result,
  TechBase,
  RulesLevel,
  EquipmentCategory,
  EntityId
} from './BaseTypes';

// ===== EQUIPMENT DEFINITION INTERFACES =====

/**
 * Core equipment interface - all equipment inherits from this
 */
export interface IEquipment extends IEquipmentConfiguration {
  readonly category: EquipmentCategory;
  readonly introductionYear: number;
  readonly extinctionYear?: number;
  readonly reintroductionYear?: number;
  readonly sourceBook?: string;
  readonly pageReference?: string;
  readonly battleValue?: number;
  readonly cost?: number;
  readonly availability?: IAvailabilityRating;
  readonly special?: string[];
  readonly variants?: IEquipmentVariant[];
}

/**
 * Availability rating for equipment
 */
export interface IAvailabilityRating {
  readonly rating: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X';
  readonly era: string;
  readonly faction?: string;
  readonly notes?: string;
}

/**
 * Equipment variant (tech base specific)
 */
export interface IEquipmentVariant {
  readonly techBase: TechBase;
  readonly weight: number;
  readonly slots: number;
  readonly cost?: number;
  readonly battleValue?: number;
  readonly modifiers?: IEquipmentModifier[];
}

/**
 * Equipment modifier
 */
export interface IEquipmentModifier {
  readonly type: 'damage' | 'range' | 'heat' | 'accuracy' | 'special';
  readonly value: number;
  readonly description: string;
  readonly conditions?: string[];
}

/**
 * Weapon-specific interface
 */
export interface IWeapon extends IEquipment {
  readonly category: EquipmentCategory.WEAPON;
  readonly weaponType: IWeaponType;
  readonly damage: number | IDamageProfile;
  readonly range: IRangeProfile;
  readonly heatGeneration: number;
  readonly ammunition?: IAmmoRequirement[];
  readonly firingModes?: IFiringMode[];
  readonly mountingRestrictions?: IMountingRestriction[];
}

/**
 * Weapon type classification
 */
export interface IWeaponType {
  readonly category: 'energy' | 'ballistic' | 'missile' | 'physical' | 'artillery' | 'capital';
  readonly subCategory: string;
  readonly technology: 'standard' | 'advanced' | 'experimental' | 'prototype';
  readonly directFire: boolean;
  readonly areaEffect: boolean;
}

/**
 * Damage profile for complex weapons
 */
export interface IDamageProfile {
  readonly primary: number;
  readonly secondary?: number;
  readonly minimum?: number;
  readonly clustering?: number;
  readonly special?: IDamageSpecial[];
}

/**
 * Special damage properties
 */
export interface IDamageSpecial {
  readonly type: 'heat' | 'stun' | 'knockdown' | 'critical' | 'explosive';
  readonly value: number;
  readonly probability?: number;
  readonly conditions?: string[];
}

/**
 * Ammunition requirement
 */
export interface IAmmoRequirement {
  readonly ammoType: string;
  readonly shotsPerTon: number;
  readonly required: boolean;
  readonly alternatives?: string[];
}

/**
 * Firing mode
 */
export interface IFiringMode {
  readonly name: string;
  readonly damage: number;
  readonly range: IRangeProfile;
  readonly heat: number;
  readonly ammunition?: number;
  readonly special?: string[];
}

/**
 * Mounting restriction
 */
export interface IMountingRestriction {
  readonly type: 'location' | 'orientation' | 'adjacency' | 'special';
  readonly description: string;
  readonly allowedLocations?: string[];
  readonly forbiddenLocations?: string[];
  readonly requiredSupport?: string[];
}

/**
 * Ammunition interface
 */
export interface IAmmunition extends IEquipment {
  readonly category: EquipmentCategory.AMMO;
  readonly ammoType: string;
  readonly compatibleWeapons: string[];
  readonly shotsPerTon: number;
  readonly specialMunitions?: ISpecialMunition[];
  readonly explosive: boolean;
  readonly caseRequired?: boolean;
}

/**
 * Special munition types
 */
export interface ISpecialMunition {
  readonly name: string;
  readonly effect: string;
  readonly damage?: number;
  readonly range?: IRangeProfile;
  readonly heat?: number;
  readonly cost?: number;
  readonly availability?: IAvailabilityRating;
}

/**
 * Heat management equipment (Selectable items like extra Heat Sinks or Coolant Pods)
 */
export interface IHeatManagementEquipment extends IEquipment {
  readonly category: EquipmentCategory.HEAT_SINK | EquipmentCategory.EQUIPMENT;
  readonly heatDissipation?: number;
  readonly heatReduction?: number;
  readonly coolingBonus?: number;
  readonly heatThreshold?: number;
  readonly engineIntegration?: boolean;
}

/**
 * Movement equipment (Selectable items like Jump Jets or MASC)
 */
export interface IMovementEquipment extends IEquipment {
  readonly category: EquipmentCategory.JUMP_JET | EquipmentCategory.EQUIPMENT;
  readonly movementBonus?: IMovementBonus;
  readonly jumpCapacity?: number;
  readonly speedMultiplier?: number;
  readonly maneuverabilityBonus?: number;
  readonly terrainModification?: ITerrainModification[];
}

/**
 * Movement bonus
 */
export interface IMovementBonus {
  readonly walkBonus: number;
  readonly runBonus: number;
  readonly jumpBonus: number;
  readonly conditions?: string[];
}

/**
 * Terrain modification
 */
export interface ITerrainModification {
  readonly terrainType: string;
  readonly movementModifier: number;
  readonly description: string;
}

/**
 * Electronic warfare equipment
 */
export interface IElectronicWarfareEquipment extends IEquipment {
  readonly category: EquipmentCategory.ELECTRONICS;
  readonly ecmStrength?: number;
  readonly eccmStrength?: number;
  readonly sensorRange?: number;
  readonly jamming?: IJammingCapability[];
  readonly detection?: IDetectionCapability[];
}

/**
 * Jamming capability
 */
export interface IJammingCapability {
  readonly targetType: string;
  readonly effectiveness: number;
  readonly range: number;
  readonly powerRequirement: number;
}

/**
 * Detection capability
 */
export interface IDetectionCapability {
  readonly targetType: string;
  readonly range: number;
  readonly accuracy: number;
  readonly conditions?: string[];
}

// ===== SERVICE INTERFACES =====

/**
 * Equipment database service
 */
export interface IEquipmentDatabase extends IService {
  getAllEquipment(): Promise<Result<IEquipment[]>>;
  getEquipmentById(id: EntityId): Promise<Result<IEquipment>>;
  getEquipmentByCategory(category: EquipmentCategory): Promise<Result<IEquipment[]>>;
  getEquipmentByTechBase(techBase: TechBase): Promise<Result<IEquipment[]>>;
  getEquipmentByRulesLevel(rulesLevel: RulesLevel): Promise<Result<IEquipment[]>>;
  searchEquipment(query: IEquipmentQuery): Promise<Result<IEquipment[]>>;
  getWeapons(): Promise<Result<IWeapon[]>>;
  getAmmunition(): Promise<Result<IAmmunition[]>>;
  getHeatManagement(): Promise<Result<IHeatManagementEquipment[]>>;
  getMovementEquipment(): Promise<Result<IMovementEquipment[]>>;
  getElectronicWarfare(): Promise<Result<IElectronicWarfareEquipment[]>>;
}

/**
 * Equipment query interface
 */
export interface IEquipmentQuery {
  readonly name?: string;
  readonly category?: EquipmentCategory[];
  readonly techBase?: TechBase[];
  readonly rulesLevel?: RulesLevel[];
  readonly era?: string;
  readonly minWeight?: number;
  readonly maxWeight?: number;
  readonly minSlots?: number;
  readonly maxSlots?: number;
  readonly requiresAmmo?: boolean;
  readonly allowedLocations?: string[];
  readonly forbiddenLocations?: string[];
  readonly special?: string[];
  readonly sortBy?: 'name' | 'weight' | 'slots' | 'cost' | 'bv';
  readonly sortOrder?: 'asc' | 'desc';
  readonly limit?: number;
  readonly offset?: number;
}

// ===== FACTORY INTERFACES =====

/**
 * Equipment factory
 */
export interface IEquipmentFactory {
  createWeapon(definition: IWeaponDefinition): Result<IWeapon>;
  createAmmunition(definition: IAmmunitionDefinition): Result<IAmmunition>;
  createHeatManagement(definition: IHeatManagementDefinition): Result<IHeatManagementEquipment>;
  createMovementEquipment(definition: IMovementDefinition): Result<IMovementEquipment>;
  createElectronicWarfare(definition: IElectronicWarfareDefinition): Result<IElectronicWarfareEquipment>;
  createCustomEquipment(definition: ICustomEquipmentDefinition): Result<IEquipment>;
}

/**
 * Equipment definition interfaces for factory
 */
export interface IWeaponDefinition {
  readonly name: string;
  readonly techBase: TechBase;
  readonly damage: number;
  readonly range: IRangeProfile;
  readonly heat: number;
  readonly weight: number;
  readonly slots: number;
  readonly cost?: number;
  readonly special?: string[];
}

export interface IAmmunitionDefinition {
  readonly name: string;
  readonly techBase: TechBase;
  readonly ammoType: string;
  readonly shotsPerTon: number;
  readonly weight: number;
  readonly explosive: boolean;
  readonly special?: string[];
}

export interface IHeatManagementDefinition {
  readonly name: string;
  readonly techBase: TechBase;
  readonly dissipation: number;
  readonly weight: number;
  readonly slots: number;
  readonly engineIntegration?: boolean;
}

export interface IMovementDefinition {
  readonly name: string;
  readonly techBase: TechBase;
  readonly movementBonus: IMovementBonus;
  readonly weight: number;
  readonly slots: number;
}

export interface IElectronicWarfareDefinition {
  readonly name: string;
  readonly techBase: TechBase;
  readonly ecmStrength?: number;
  readonly sensorRange?: number;
  readonly weight: number;
  readonly slots: number;
}

export interface ICustomEquipmentDefinition {
  readonly name: string;
  readonly techBase: TechBase;
  readonly category: EquipmentCategory;
  readonly weight: number;
  readonly slots: number;
  readonly cost?: number;
  readonly special?: string[];
}
