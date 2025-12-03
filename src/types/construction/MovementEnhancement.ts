/**
 * Movement Enhancement Type Definitions
 * 
 * Defines MASC, TSM, Supercharger, and other movement enhancers.
 * 
 * @spec openspec/specs/movement-system/spec.md
 * 
 * @deprecated The weight/slot functions in MOVEMENT_ENHANCEMENT_DEFINITIONS use incorrect
 * formulas (based on tonnage). For accurate calculations, use EquipmentCalculatorService
 * with the following variable equipment IDs:
 * - 'masc-is': ceil(engineRating / 20) for weight and slots
 * - 'masc-clan': ceil(engineRating / 25) for weight and slots
 * - 'supercharger': ceil(engineWeight / 10) rounded to 0.5t for weight, 1 slot (fixed)
 */

import { TechBase } from '../enums/TechBase';
import { RulesLevel } from '../enums/RulesLevel';

/**
 * Movement enhancement type enumeration
 */
export enum MovementEnhancementType {
  MASC = 'MASC',
  SUPERCHARGER = 'Supercharger',
  TSM = 'Triple-Strength Myomer',
  PARTIAL_WING = 'Partial Wing',
}

/**
 * Movement enhancement definition
 */
export interface MovementEnhancementDefinition {
  readonly type: MovementEnhancementType;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  /** Weight calculation function */
  readonly getWeight: (tonnage: number) => number;
  /** Critical slots */
  readonly getCriticalSlots: (tonnage: number) => number;
  /** Movement multiplier when active */
  readonly activeMultiplier: number;
  /** Can be used with other enhancements? */
  readonly exclusions: MovementEnhancementType[];
  /** Introduction year */
  readonly introductionYear: number;
}

/**
 * Movement enhancement definitions
 * 
 * @deprecated The getWeight/getCriticalSlots functions for MASC and Supercharger
 * use incorrect formulas. Use EquipmentCalculatorService for accurate calculations.
 */
export const MOVEMENT_ENHANCEMENT_DEFINITIONS: readonly MovementEnhancementDefinition[] = [
  {
    type: MovementEnhancementType.MASC,
    name: 'Myomer Accelerator Signal Circuitry (MASC)',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    // DEPRECATED: This uses tonnage but should use engineRating
    // Correct formula: ceil(engineRating / 20) for IS, ceil(engineRating / 25) for Clan
    // Use EquipmentCalculatorService.calculateProperties('masc-is' or 'masc-clan', context)
    getWeight: (tonnage) => Math.ceil(tonnage / 20),
    getCriticalSlots: (tonnage) => {
      // DEPRECATED: Should be ceil(engineRating / 20) for IS, ceil(engineRating / 25) for Clan
      if (tonnage <= 35) return 2;
      if (tonnage <= 55) return 3;
      if (tonnage <= 85) return 4;
      return 5;
    },
    activeMultiplier: 2.0, // sprint = walk × 2
    exclusions: [], // Can combine with Supercharger but NOT another MASC
    introductionYear: 2740,
  },
  {
    type: MovementEnhancementType.SUPERCHARGER,
    name: 'Supercharger',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    // DEPRECATED: This uses tonnage but should use engineWeight
    // Correct formula: ceil(engineWeight / 10) rounded to 0.5 tons
    // Use EquipmentCalculatorService.calculateProperties('supercharger', { engineWeight })
    getWeight: (tonnage) => Math.ceil(tonnage / 10) * 0.5,
    getCriticalSlots: () => 1, // This is correct - Supercharger always has 1 slot
    activeMultiplier: 2.0, // sprint = walk × 2
    exclusions: [], // Can combine with MASC
    introductionYear: 3072,
  },
  {
    type: MovementEnhancementType.TSM,
    name: 'Triple-Strength Myomer',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    getWeight: () => 0, // No weight
    getCriticalSlots: () => 6, // 6 total, distributed (1 per location except head)
    activeMultiplier: 1.5, // +2 walk MP when activated
    exclusions: [MovementEnhancementType.MASC], // Incompatible with MASC
    introductionYear: 3050,
  },
  {
    type: MovementEnhancementType.PARTIAL_WING,
    name: 'Partial Wing',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    getWeight: (tonnage) => {
      if (tonnage <= 55) return 3;
      if (tonnage <= 75) return 4;
      return 5;
    },
    getCriticalSlots: () => 6, // 3 per side torso
    activeMultiplier: 1.0, // Adds jump MP, doesn't multiply
    exclusions: [],
    introductionYear: 3067,
  },
] as const;

/**
 * Get movement enhancement definition by type
 */
export function getMovementEnhancementDefinition(
  type: MovementEnhancementType
): MovementEnhancementDefinition | undefined {
  return MOVEMENT_ENHANCEMENT_DEFINITIONS.find(def => def.type === type);
}

/**
 * Calculate MASC weight
 * 
 * @deprecated This function uses incorrect formula (tonnage-based).
 * Use EquipmentCalculatorService.calculateProperties('masc-is' or 'masc-clan', { engineRating, tonnage })
 * Correct formula: ceil(engineRating / 20) for IS, ceil(engineRating / 25) for Clan
 */
export function calculateMASCWeight(tonnage: number): number {
  const def = getMovementEnhancementDefinition(MovementEnhancementType.MASC);
  return def?.getWeight(tonnage) ?? 0;
}

/**
 * Calculate MASC critical slots
 * 
 * @deprecated This function uses incorrect formula (tonnage-based).
 * Use EquipmentCalculatorService.calculateProperties('masc-is' or 'masc-clan', { engineRating, tonnage })
 * Correct formula: ceil(engineRating / 20) for IS, ceil(engineRating / 25) for Clan
 */
export function calculateMASCSlots(tonnage: number): number {
  const def = getMovementEnhancementDefinition(MovementEnhancementType.MASC);
  return def?.getCriticalSlots(tonnage) ?? 0;
}

/**
 * Calculate Supercharger weight
 * 
 * @deprecated This function uses incorrect formula (tonnage-based).
 * Use EquipmentCalculatorService.calculateProperties('supercharger', { engineWeight })
 * Correct formula: ceil(engineWeight / 10) rounded to 0.5 tons
 */
export function calculateSuperchargerWeight(tonnage: number): number {
  const def = getMovementEnhancementDefinition(MovementEnhancementType.SUPERCHARGER);
  return def?.getWeight(tonnage) ?? 0;
}

/**
 * Validate movement enhancement compatibility
 */
export function validateEnhancementCombination(
  enhancements: MovementEnhancementType[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for duplicates
  const uniqueTypes = new Set(enhancements);
  if (uniqueTypes.size !== enhancements.length) {
    errors.push('Cannot have multiple of the same movement enhancement');
  }
  
  // Check exclusions
  for (const type of enhancements) {
    const def = getMovementEnhancementDefinition(type);
    if (def) {
      for (const exclusion of def.exclusions) {
        if (enhancements.includes(exclusion)) {
          errors.push(`${type} is incompatible with ${exclusion}`);
        }
      }
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

