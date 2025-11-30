/**
 * Equipment Calculator Service
 * 
 * Unified entry point for calculating variable equipment properties.
 * Dispatches to appropriate calculation functions based on equipment type.
 * 
 * @spec openspec/changes/add-variable-equipment-calculations
 */

import { TechBase } from '../../types/enums/TechBase';
import {
  IVariableEquipmentContext,
  ICalculatedEquipmentProperties,
  VariableEquipmentCalculator,
  createVariableEquipmentContext,
} from '../../types/equipment/VariableEquipment';
import {
  calculateTargetingComputer,
  calculateMASC,
  calculateSupercharger,
  calculatePartialWing,
  calculateTSM,
  calculateHatchet,
  calculateSword,
  calculateMace,
  calculateLance,
  calculateClaws,
  calculateTalons,
  calculateRetractableBlade,
  calculateFlail,
  calculateWreckingBall,
} from './variableEquipmentCalculations';

/**
 * Calculation function registry
 * Maps calculation IDs to their functions
 */
const CALCULATION_REGISTRY: Record<string, VariableEquipmentCalculator> = {
  'targeting-computer': calculateTargetingComputer,
  'masc': calculateMASC,
  'supercharger': calculateSupercharger,
  'partial-wing': calculatePartialWing,
  'tsm': calculateTSM,
};

/**
 * Physical weapon calculation functions
 * These take mechTonnage instead of full context
 */
const PHYSICAL_WEAPON_REGISTRY: Record<string, (tonnage: number) => ICalculatedEquipmentProperties> = {
  'hatchet': calculateHatchet,
  'sword': calculateSword,
  'mace': calculateMace,
  'lance': calculateLance,
  'claws': calculateClaws,
  'talons': calculateTalons,
  'retractable-blade': calculateRetractableBlade,
  'flail': calculateFlail,
  'wrecking-ball': calculateWreckingBall,
};

/**
 * Check if a calculation ID is registered
 */
export function isCalculationRegistered(calculationId: string): boolean {
  return calculationId in CALCULATION_REGISTRY || calculationId in PHYSICAL_WEAPON_REGISTRY;
}

/**
 * Get all registered calculation IDs
 */
export function getRegisteredCalculations(): string[] {
  return [
    ...Object.keys(CALCULATION_REGISTRY),
    ...Object.keys(PHYSICAL_WEAPON_REGISTRY),
  ];
}

/**
 * Calculate equipment properties using the appropriate function
 * 
 * @param calculationId - ID of the calculation to use
 * @param context - Variable equipment context with mech configuration
 * @returns Calculated equipment properties
 * @throws Error if calculation ID is not registered
 */
export function calculateEquipmentProperties(
  calculationId: string,
  context: IVariableEquipmentContext
): ICalculatedEquipmentProperties {
  // Check standard calculations first
  const calculator = CALCULATION_REGISTRY[calculationId];
  if (calculator) {
    return calculator(context);
  }

  // Check physical weapon calculations
  const physicalCalculator = PHYSICAL_WEAPON_REGISTRY[calculationId];
  if (physicalCalculator) {
    return physicalCalculator(context.mechTonnage);
  }

  throw new Error(`Unknown calculation ID: ${calculationId}`);
}

/**
 * Calculate equipment properties with partial context
 * Fills in default values for missing context properties
 * 
 * @param calculationId - ID of the calculation to use
 * @param partialContext - Partial context with known values
 * @returns Calculated equipment properties
 */
export function calculateEquipmentPropertiesWithDefaults(
  calculationId: string,
  partialContext: Partial<IVariableEquipmentContext>
): ICalculatedEquipmentProperties {
  const fullContext = createVariableEquipmentContext(partialContext);
  return calculateEquipmentProperties(calculationId, fullContext);
}

/**
 * Calculate Targeting Computer properties
 * Convenience function with direct parameters
 */
export function calculateTargetingComputerProperties(
  directFireWeaponTonnage: number,
  techBase: TechBase = TechBase.INNER_SPHERE
): ICalculatedEquipmentProperties {
  return calculateEquipmentPropertiesWithDefaults('targeting-computer', {
    directFireWeaponTonnage,
    techBase,
  });
}

/**
 * Calculate MASC properties
 * Convenience function with direct parameters
 */
export function calculateMASCProperties(
  engineRating: number,
  mechTonnage: number,
  techBase: TechBase = TechBase.INNER_SPHERE
): ICalculatedEquipmentProperties {
  return calculateEquipmentPropertiesWithDefaults('masc', {
    engineRating,
    mechTonnage,
    techBase,
  });
}

/**
 * Calculate Supercharger properties
 * Convenience function with direct parameters
 */
export function calculateSuperchargerProperties(
  engineWeight: number
): ICalculatedEquipmentProperties {
  return calculateEquipmentPropertiesWithDefaults('supercharger', {
    engineWeight,
  });
}

/**
 * Calculate Partial Wing properties
 * Convenience function with direct parameters
 */
export function calculatePartialWingProperties(
  mechTonnage: number
): ICalculatedEquipmentProperties {
  return calculateEquipmentPropertiesWithDefaults('partial-wing', {
    mechTonnage,
  });
}

/**
 * Calculate TSM properties
 * Convenience function with direct parameters
 */
export function calculateTSMProperties(
  mechTonnage: number
): ICalculatedEquipmentProperties {
  return calculateEquipmentPropertiesWithDefaults('tsm', {
    mechTonnage,
  });
}

/**
 * Calculate Physical Weapon properties
 * Convenience function with direct parameters
 * 
 * @param weaponType - Physical weapon type (hatchet, sword, mace, etc.)
 * @param mechTonnage - Mech tonnage
 * @returns Calculated properties
 */
export function calculatePhysicalWeaponProperties(
  weaponType: string,
  mechTonnage: number
): ICalculatedEquipmentProperties {
  const calculator = PHYSICAL_WEAPON_REGISTRY[weaponType.toLowerCase()];
  if (!calculator) {
    throw new Error(`Unknown physical weapon type: ${weaponType}`);
  }
  return calculator(mechTonnage);
}

