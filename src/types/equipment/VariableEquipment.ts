/**
 * Variable Equipment Types
 * 
 * Interfaces and types for equipment with variable properties
 * that depend on mech configuration.
 * 
 * @spec openspec/changes/add-variable-equipment-calculations
 */

import { TechBase } from '../enums/TechBase';

/**
 * Properties that can be variable for equipment
 */
export enum VariableProperty {
  WEIGHT = 'weight',
  SLOTS = 'slots',
  COST = 'cost',
  BATTLE_VALUE = 'battleValue',
  DAMAGE = 'damage',
}

/**
 * Context required for calculating variable equipment properties
 */
export interface IVariableEquipmentContext {
  /** Mech total tonnage (20-100 for standard mechs) */
  readonly mechTonnage: number;
  
  /** Engine rating (calculated from tonnage × walkMP) */
  readonly engineRating: number;
  
  /** Engine weight in tons (from engine type and rating) */
  readonly engineWeight: number;
  
  /** Total tonnage of direct-fire weapons (for targeting computer) */
  readonly directFireWeaponTonnage: number;
  
  /** Tech base (affects some calculations) */
  readonly techBase: TechBase;
}

/**
 * Configuration for variable equipment
 */
export interface IVariableEquipmentConfig {
  /** Which properties are variable */
  readonly variableProperties: readonly VariableProperty[];
  
  /** ID linking to calculation function */
  readonly calculationId: string;
  
  /** Required inputs from context */
  readonly inputRequirements: readonly (keyof IVariableEquipmentContext)[];
}

/**
 * Result of variable equipment calculation
 */
export interface ICalculatedEquipmentProperties {
  /** Calculated weight in tons */
  readonly weight: number;
  
  /** Calculated critical slots */
  readonly criticalSlots: number;
  
  /** Calculated cost in C-Bills */
  readonly costCBills: number;
  
  /** Calculated battle value (optional) */
  readonly battleValue?: number;
  
  /** Calculated damage (for physical weapons) */
  readonly damage?: number;
}

/**
 * Type for a variable equipment calculation function
 */
export type VariableEquipmentCalculator = (
  context: IVariableEquipmentContext
) => ICalculatedEquipmentProperties;

/**
 * Check if equipment has variable properties
 */
export function isVariableEquipment(
  equipment: { isVariable?: boolean }
): equipment is { isVariable: true; variableConfig: IVariableEquipmentConfig } {
  return equipment.isVariable === true;
}

/**
 * Create a minimal context for calculations
 */
export function createVariableEquipmentContext(
  partial: Partial<IVariableEquipmentContext>
): IVariableEquipmentContext {
  return {
    mechTonnage: partial.mechTonnage ?? 50,
    engineRating: partial.engineRating ?? 200,
    engineWeight: partial.engineWeight ?? 8.5,
    directFireWeaponTonnage: partial.directFireWeaponTonnage ?? 0,
    techBase: partial.techBase ?? TechBase.INNER_SPHERE,
  };
}

