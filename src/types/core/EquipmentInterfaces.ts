/**
 * Equipment Interface Definitions
 *
 * Core interfaces for BattleTech equipment including weapons, ammunition,
 * and equipment allocation. These types support validation, configuration,
 * and equipment database operations.
 *
 * @module types/core/EquipmentInterfaces
 */

import { TechBase, RulesLevel, EntityId, Severity } from './index';

export interface IEquipment {
  readonly id: EntityId;
  readonly name: string;
  readonly type: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly cost?: number;
  readonly battleValue?: number;
  readonly requiresAmmo?: boolean;
}

export interface IWeapon extends IEquipment {
  readonly heat: number;
  readonly damage: number | string;
  readonly range: {
    readonly min?: number;
    readonly short: number;
    readonly medium: number;
    readonly long: number;
    readonly extreme?: number;
  };
  readonly ammoType?: string;
}

export interface IAmmunition extends IEquipment {
  readonly ammoType: string;
  readonly shotsPerTon: number;
  readonly damagePerShot?: number;
}

export interface IEquipmentInstance {
  readonly id: EntityId;
  readonly equipmentId: EntityId;
  readonly equipment: IEquipment;
  readonly location: string;
  readonly slotIndex: number;
  readonly quantity: number;
  readonly status: {
    operational: boolean;
    damaged: boolean;
    destroyed: boolean;
    criticalHits: number;
  };
  readonly configuration?: unknown;
}

export interface IEquipmentAllocation {
  readonly id: EntityId;
  readonly equipmentId: EntityId;
  readonly location: string;
  readonly quantity: number;
  readonly slotIndex: number;
}

export interface IEquipmentDatabase {
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  searchEquipment?(criteria: unknown): Promise<IEquipment[]>;
}

export interface IEquipmentFactory {
  createEquipmentInstance(equipment: IEquipment, configuration?: unknown): IEquipmentInstance;
}

export interface IEquipmentValidationStrategy {
  validateEquipment(unitConfig: IUnitConfiguration, allocations: IEquipmentAllocation[]): Promise<IEquipmentValidationResult>;
}

export interface IUnitConfiguration {
  readonly id: EntityId;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly tonnage: number;
}

export interface IEquipmentValidationResult {
  readonly isValid: boolean;
  readonly violations: IValidationViolation[];
  readonly warnings: IValidationViolation[];
  readonly timestamp: Date;
  readonly weaponValidation: IWeaponValidation;
  readonly ammoValidation: IAmmoValidation;
  readonly specialEquipmentValidation: ISpecialEquipmentValidation;
  readonly placementValidation: IPlacementValidation;
}

export interface IValidationViolation {
  readonly code: string;
  readonly message: string;
  readonly severity: Severity;
  readonly location?: string;
}

export interface IWeaponValidation {
  readonly weaponCount: number;
  readonly totalWeaponWeight: number;
  readonly heatGeneration: number;
  readonly firepowerRating: number;
  readonly rangeProfile: IRangeProfile;
  readonly weaponCompatibility: unknown[];
}

export interface IRangeProfile {
  readonly shortRange: { damage: number; accuracy: number; effectiveness: number };
  readonly mediumRange: { damage: number; accuracy: number; effectiveness: number };
  readonly longRange: { damage: number; accuracy: number; effectiveness: number };
  readonly overallEffectiveness: number;
}

export interface IAmmoValidation {
  readonly totalAmmoWeight: number;
  readonly ammoBalance: unknown[];
  readonly caseProtection: {
    requiredLocations: string[];
    protectedLocations: string[];
    unprotectedLocations: string[];
    isCompliant: boolean;
    riskLevel: Severity;
  };
  readonly explosiveRisks: unknown[];
}

export interface ISpecialEquipmentValidation {
  readonly specialEquipment: unknown[];
  readonly synergies: unknown[];
  readonly conflicts: unknown[];
}

export interface IPlacementValidation {
  readonly locationConstraints: unknown[];
  readonly placementViolations: unknown[];
  readonly optimization: {
    currentEfficiency: number;
    potentialEfficiency: number;
    improvements: string[];
  };
}

export interface ICompleteUnitState {
  readonly id: EntityId;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly tonnage: number;
  readonly equipment: IEquipmentInstance[];
}


